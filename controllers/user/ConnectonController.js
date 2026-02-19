const mongoose = require("mongoose");
const Connection = require("../../models/Connection.model");
const { emitToUser } = require("../../socket");


exports.sendConnectionRequest = async (req, res) => {
  try {
    const io = req.app.get("io");

    const requesterId = req.user.id;
    const { recipientId } = req.body;

    if (!recipientId || !mongoose.Types.ObjectId.isValid(recipientId)) {
      return res.status(400).json({ message: "Invalid recipient" });
    }

    if (requesterId === recipientId) {
      return res.status(400).json({ message: "Cannot connect to yourself" });
    }

    const existing = await Connection.findOne({
      $or: [
        { requester: requesterId, recipient: recipientId },
        { requester: recipientId, recipient: requesterId },
      ],
    });

    if (existing) {
      // Already connected
      if (existing.status === "ACCEPTED") {
        return res.status(409).json({ message: "Already connected" });
      }

      // Reverse pending → auto accept
      if (
        existing.status === "PENDING" &&
        existing.recipient.equals(requesterId)
      ) {
        const updated = await Connection.findOneAndUpdate(
          {
            _id: existing._id,
            status: "PENDING",
          },
          {
            status: "ACCEPTED",
            respondedAt: new Date(),
          },
          { new: true }
        );

        // 🔔 Notify original requester
        emitToUser(io, updated.requester, "connection_accepted", {
          connectionId: updated._id,
          by: requesterId,
        });

        return res.json({
          message: "Connection auto-accepted",
          connection: updated,
        });
      }

      if (existing.status === "PENDING") {
        return res.status(409).json({
          message: "Connection request already pending",
        });
      }

      if (existing.status === "REJECTED") {
        const updated = await Connection.findOneAndUpdate(
          { _id: existing._id },
          {
            requester: requesterId,
            recipient: recipientId,
            status: "PENDING",
            respondedAt: null,
          },
          { new: true }
        );

        // 🔔 Notify recipient
        emitToUser(io, recipientId, "connection_request", {
          connectionId: updated._id,
          from: requesterId,
        });

        return res.json({
          message: "Connection request re-sent",
          connection: updated,
        });
      }

      if (existing.status === "BLOCKED") {
        return res.status(403).json({ message: "User is blocked" });
      }
    }

    const connection = await Connection.create({
      requester: requesterId,
      recipient: recipientId,
      status: "PENDING",
    });

    // 🔔 Notify recipient
    emitToUser(io, recipientId, "connection_request", {
      connectionId: connection._id,
      from: requesterId,
    });

    return res.status(201).json({
      message: "Connection request sent",
      connection,
    });

  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        message: "Connection already exists",
      });
    }

    console.error("Send Connection Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.acceptConnection = async (req, res) => {
  try {
    const io = req.app.get("io");

    const userId = req.user.id;
    const { connectionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(connectionId)) {
      return res.status(400).json({ message: "Invalid connection ID" });
    }

    const updated = await Connection.findOneAndUpdate(
      {
        _id: connectionId,
        recipient: userId,
        status: "PENDING",
      },
      {
        status: "ACCEPTED",
        respondedAt: new Date(),
      },
      { new: true }
    );

    if (!updated) {
      return res.status(400).json({
        message: "Invalid or already processed request",
      });
    }

    // 🔔 Notify requester
    emitToUser(io, updated.requester, "connection_accepted", {
      connectionId: updated._id,
      by: userId,
    });

    return res.json({
      message: "Connection accepted",
      connection: updated,
    });

  } catch (err) {
    console.error("Accept Connection Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.rejectConnection = async (req, res) => {
  try {
    const io = req.app.get("io");

    const userId = req.user.id;
    const { connectionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(connectionId)) {
      return res.status(400).json({ message: "Invalid connection ID" });
    }

    const updated = await Connection.findOneAndUpdate(
      {
        _id: connectionId,
        recipient: userId,
        status: "PENDING",
      },
      {
        status: "REJECTED",
        respondedAt: new Date(),
      },
      { new: true }
    );

    if (!updated) {
      return res.status(400).json({
        message: "Invalid or already processed request",
      });
    }

    // 🔔 Notify requester
    emitToUser(io, updated.requester, "connection_rejected", {
      connectionId: updated._id,
      by: userId,
    });

    return res.json({
      message: "Connection rejected",
      connection: updated,
    });

  } catch (err) {
    console.error("Reject Connection Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.removeConnection = async (req, res) => {
  try {
    const io = req.app.get("io");

    const userId = req.user.id;
    const { connectionId } = req.params;

    const deleted = await Connection.findOneAndDelete({
      _id: connectionId,
      status: "ACCEPTED",
      $or: [
        { requester: userId },
        { recipient: userId }
      ]
    });

    if (!deleted) {
      return res.status(400).json({
        message: "Cannot remove this connection"
      });
    }

    const otherUser =
      deleted.requester.toString() === userId
        ? deleted.recipient
        : deleted.requester;

    // 🔔 Notify other user
    emitToUser(io, otherUser, "connection_removed", {
      connectionId: connectionId,
      by: userId,
    });

    return res.json({ message: "Connection removed" });

  } catch (err) {
    console.error("Remove Connection Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.getAcceptedConnections = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const connections = await Connection.find({
      status: "ACCEPTED",
      $or: [
        { requester: userId },
        { recipient: userId }
      ]
    })
      .populate("requester recipient", "fullname username profileImage")
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ updatedAt: -1 });

    const formatted = connections.map(conn => {
      const otherUser =
        conn.requester._id.toString() === userId
          ? conn.recipient
          : conn.requester;

      return {
        id: conn._id,
        user: otherUser,
        connectedAt: conn.respondedAt
      };
    });

    return res.json(formatted);
  } catch (err) {
    console.error("List Accepted Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.getIncomingRequests = async (req, res) => {
  try {
    const userId = req.user.id;

    const requests = await Connection.find({
      recipient: userId,
      status: "PENDING"
    })
      .populate("requester", "fullname username profileImage")
      .sort({ createdAt: -1 });

    return res.json(requests);
  } catch (err) {
    console.error("Incoming Requests Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.getOutgoingRequests = async (req, res) => {
  try {
    const userId = req.user.id;

    const requests = await Connection.find({
      requester: userId,
      status: "PENDING"
    })
      .populate("recipient", "fullname username profileImage")
      .sort({ createdAt: -1 });

    return res.json(requests);
  } catch (err) {
    console.error("Outgoing Requests Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
