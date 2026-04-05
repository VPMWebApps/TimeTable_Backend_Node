const mongoose = require("mongoose");
const Connection = require("../../models/Connection.model");
const { emitToUser } = require("../../socket");

// ─── Helper: populate both parties and return the "other user" shape ──────────
// Reused by accept and send so both always return a fully populated connection
// in the same normalised shape the frontend expects.
const populateConnection = (connectionId) =>
  Connection.findById(connectionId).populate(
    "requester recipient",
    "fullname username email profilePicture jobTitle company stream batch linkedin role"
  );

// ─── Send connection request ───────────────────────────────────────────────────
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
      if (existing.status === "ACCEPTED") {
        return res.status(409).json({ message: "Already connected" });
      }

      // Reverse pending → auto accept
      if (
        existing.status === "PENDING" &&
        existing.recipient.equals(requesterId)
      ) {
        await Connection.findByIdAndUpdate(existing._id, {
          status: "ACCEPTED",
          respondedAt: new Date(),
        });

        // FIX: populate before returning so frontend gets full user objects
        const populated = await populateConnection(existing._id);

        // FIX: use colon-style event name consistently
        emitToUser(io, populated.requester._id, "connection:accepted", {
          connection: populated,
        });

        return res.json({
          message: "Connection auto-accepted",
          connection: populated,
        });
      }

      if (existing.status === "PENDING") {
        return res.status(409).json({ message: "Connection request already pending" });
      }

      if (existing.status === "REJECTED") {
        await Connection.findByIdAndUpdate(existing._id, {
          requester: requesterId,
          recipient: recipientId,
          status: "PENDING",
          respondedAt: null,
        });

        const populated = await populateConnection(existing._id);

        emitToUser(io, recipientId, "connection:request", {
          connection: populated,
        });

        return res.json({
          message: "Connection request re-sent",
          connection: populated,
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

    // FIX: populate before returning
    const populated = await populateConnection(connection._id);

    emitToUser(io, recipientId, "connection:request", {
      connection: populated,
    });

    return res.status(201).json({
      message: "Connection request sent",
      connection: populated,
    });

  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "Connection already exists" });
    }
    console.error("Send Connection Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ─── Accept connection ─────────────────────────────────────────────────────────
exports.acceptConnection = async (req, res) => {
  try {
    const io = req.app.get("io");
    const userId = req.user.id;
    const { connectionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(connectionId)) {
      return res.status(400).json({ message: "Invalid connection ID" });
    }

    const updated = await Connection.findOneAndUpdate(
      { _id: connectionId, recipient: userId, status: "PENDING" },
      { status: "ACCEPTED", respondedAt: new Date() },
      { new: true }
    );

    if (!updated) {
      return res.status(400).json({ message: "Invalid or already processed request" });
    }

    // FIX: populate so both sides get full user objects in the socket payload
    // and in the HTTP response — this is what was missing before.
    const populated = await populateConnection(updated._id);

    // FIX: use colon-style event name; emit full populated connection so User A
    // can immediately update their Redux state without a page refresh.
    emitToUser(io, populated.requester._id, "connection:accepted", {
      connection: populated,
    });

    return res.json({
      message: "Connection accepted",
      connection: populated,   // ← now has requester/recipient as full user objects
    });

  } catch (err) {
    console.error("Accept Connection Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ─── Reject connection ─────────────────────────────────────────────────────────
exports.rejectConnection = async (req, res) => {
  try {
    const io = req.app.get("io");
    const userId = req.user.id;
    const { connectionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(connectionId)) {
      return res.status(400).json({ message: "Invalid connection ID" });
    }

    const updated = await Connection.findOneAndUpdate(
      { _id: connectionId, recipient: userId, status: "PENDING" },
      { status: "REJECTED", respondedAt: new Date() },
      { new: true }
    );

    if (!updated) {
      return res.status(400).json({ message: "Invalid or already processed request" });
    }

    emitToUser(io, updated.requester, "connection:rejected", {
      connectionId: updated._id,
      by: userId,
    });

    return res.json({ message: "Connection rejected", connection: updated });

  } catch (err) {
    console.error("Reject Connection Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ─── Remove connection ─────────────────────────────────────────────────────────
exports.removeConnection = async (req, res) => {
  try {
    const io = req.app.get("io");
    const userId = req.user.id;
    const { connectionId } = req.params;

    const deleted = await Connection.findOneAndDelete({
      _id: connectionId,
      status: "ACCEPTED",
      $or: [{ requester: userId }, { recipient: userId }],
    });

    if (!deleted) {
      return res.status(400).json({ message: "Cannot remove this connection" });
    }

    const otherUser =
      deleted.requester.toString() === userId
        ? deleted.recipient
        : deleted.requester;

    emitToUser(io, otherUser, "connection:removed", {
      connectionId,
      by: userId,
    });

    return res.json({ message: "Connection removed" });

  } catch (err) {
    console.error("Remove Connection Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ─── Get accepted connections ──────────────────────────────────────────────────
exports.getAcceptedConnections = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const connections = await Connection.find({
      status: "ACCEPTED",
      $or: [{ requester: userId }, { recipient: userId }],
    })
      // FIX: was populating "profileImage" — changed to "profilePicture" to match
      // the field name used everywhere in the frontend (profilePicture).
      .populate(
        "requester recipient",
        "fullname username email profilePicture jobTitle company stream batch linkedin role"
      )
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ updatedAt: -1 });

    const formatted = connections.map((conn) => {
      const otherUser =
        conn.requester._id.toString() === userId ? conn.recipient : conn.requester;

      return {
        // FIX: was returning `id` (without underscore) which broke removeConnection
        // filtering (`conn._id !== connectionId` was always true because _id was undefined).
        _id: conn._id,
        user: otherUser,           // full populated user object — getConnectionStatus needs user._id
        connectedAt: conn.respondedAt,
      };
    });

    return res.json(formatted);

  } catch (err) {
    console.error("List Accepted Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ─── Get incoming requests ─────────────────────────────────────────────────────
exports.getIncomingRequests = async (req, res) => {
  try {
    const userId = req.user.id;

    const requests = await Connection.find({ recipient: userId, status: "PENDING" })
      .populate(
        "requester",
        "fullname username email profilePicture jobTitle company stream batch linkedin role"
      )
      .sort({ createdAt: -1 });

    return res.json(requests);

  } catch (err) {
    console.error("Incoming Requests Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ─── Get outgoing requests ─────────────────────────────────────────────────────
exports.getOutgoingRequests = async (req, res) => {
  try {
    const userId = req.user.id;

    const requests = await Connection.find({ requester: userId, status: "PENDING" })
      .populate(
        "recipient",
        "fullname username email profilePicture jobTitle company stream batch linkedin role"
      )
      .sort({ createdAt: -1 });

    return res.json(requests);

  } catch (err) {
    console.error("Outgoing Requests Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ─── Withdraw (cancel) outgoing pending request ────────────────────────────────
exports.withdrawConnection = async (req, res) => {
  try {
    const io = req.app.get("io");
    const userId = req.user.id;
    const { connectionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(connectionId)) {
      return res.status(400).json({ message: "Invalid connection ID" });
    }

    const deleted = await Connection.findOneAndDelete({
      _id: connectionId,
      requester: userId,
      status: "PENDING",
    });

    if (!deleted) {
      return res.status(400).json({ message: "Cannot withdraw this request" });
    }

    // Notify the recipient in real-time so their incoming list updates instantly
    emitToUser(io, deleted.recipient, "connection:withdrawn", {
      connectionId: deleted._id,
      by: userId,
    });

    return res.json({ message: "Connection request withdrawn" });

  } catch (err) {
    console.error("Withdraw Connection Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};