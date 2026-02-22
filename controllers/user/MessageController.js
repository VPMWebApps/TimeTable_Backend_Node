const mongoose = require("mongoose");
const Message = require("../../models/Message.model");
const Conversation = require("../../models/Conversation.model");
const Connection = require("../../models/Connection.model");
const { emitToUser } = require("../../socket");
const { uploadFileToCloudinary } = require("../../helpers/Cloudinary");

async function getActiveConnection(userA, userB) {
  return Connection.findOne({
    status: "ACCEPTED",
    $or: [
      { requester: userA, recipient: userB },
      { requester: userB, recipient: userA },
    ],
  });
}

async function getOrCreateConversation(connection, userA, userB) {
  let conversation = await Conversation.findOne({ connection: connection._id });
  if (!conversation) {
    conversation = await Conversation.create({
      participants: [userA, userB],
      connection: connection._id,
      unreadCount: { [userA]: 0, [userB]: 0 },
    });
  }
  return conversation;
}

/* ─────────────────────────────────────────
   SEND MESSAGE
   POST /api/user/message/send
   Body (multipart/form-data):
     recipientId, content?, replyTo?, files[]
───────────────────────────────────────── */
exports.sendMessage = async (req, res) => {
  try {
    const io = req.app.get("io");
    const senderId = req.user.id;
    const { recipientId, content, replyTo } = req.body;
    const files = req.files || [];

    console.log("📎 Files received:", files.length);
    console.log("📎 Body:", req.body);
    console.log("📎 Content-Type:", req.headers["content-type"]);

    // Validation
    if (!recipientId || !mongoose.Types.ObjectId.isValid(recipientId)) {
      return res.status(400).json({ message: "Invalid recipient" });
    }
    if (senderId === recipientId) {
      return res.status(400).json({ message: "Cannot message yourself" });
    }
    if (!content?.trim() && files.length === 0) {
      return res.status(400).json({ message: "Message cannot be empty" });
    }
    if (content && content.trim().length > 5000) {
      return res.status(400).json({ message: "Message too long (max 5000 chars)" });
    }
    if (files.length > 5) {
      return res.status(400).json({ message: "Max 5 files per message" });
    }

    const connection = await getActiveConnection(senderId, recipientId);
    if (!connection) {
      return res.status(403).json({ message: "You are not connected with this user" });
    }

    if (replyTo) {
      if (!mongoose.Types.ObjectId.isValid(replyTo)) {
        return res.status(400).json({ message: "Invalid replyTo message ID" });
      }
      const parent = await Message.findById(replyTo);
      if (!parent || parent.deletedForEveryone) {
        return res.status(404).json({ message: "Reply target not found" });
      }
    }

    const conversation = await getOrCreateConversation(connection, senderId, recipientId);

    // Upload attachments to Cloudinary
    const attachments = [];
    for (const file of files) {
      try {
        const result = await uploadFileToCloudinary(
          file.buffer,
          file.mimetype,
          file.originalname
        );

        const type = file.mimetype.startsWith("image/") ? "image"
          : file.mimetype.startsWith("video/") ? "video"
            : file.mimetype.startsWith("audio/") ? "audio"
              : "file";

        attachments.push({
          url: result.secure_url,
          type,
          name: file.originalname,
          size: file.size,
        });
      } catch (uploadErr) {
        console.error("Cloudinary upload error:", uploadErr);
        return res.status(500).json({ message: `Failed to upload ${file.originalname}` });
      }
    }

    const message = await Message.create({
      conversation: conversation._id,
      sender: senderId,
      content: content?.trim() || "",
      replyTo: replyTo || null,
      attachments,
    });

    const unreadCount = conversation.unreadCount || new Map();
    const recipientUnread = (unreadCount.get(recipientId) || 0) + 1;

    await Conversation.findByIdAndUpdate(conversation._id, {
      lastMessage: message._id,
      [`unreadCount.${recipientId}`]: recipientUnread,
    });

    const populated = await Message.findById(message._id)
      .populate("sender", "fullname username profileImage")
      .populate({
        path: "replyTo",
        populate: { path: "sender", select: "fullname username profileImage" },
      });

    emitToUser(io, recipientId, "new_message", {
      conversationId: conversation._id,
      message: populated,
    });

    return res.status(201).json({
      message: populated,
      conversationId: conversation._id,
    });
  } catch (err) {
    console.error("Send Message Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ─────────────────────────────────────────
   GET MESSAGES
───────────────────────────────────────── */
exports.getMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;
    const { page = 1, limit = 30 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ message: "Invalid conversation ID" });
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
    });
    if (!conversation) return res.status(403).json({ message: "Access denied" });

    const connection = await Connection.findOne({
      _id: conversation.connection,
      status: "ACCEPTED",
    });
    if (!connection) return res.status(403).json({ message: "You are no longer connected with this user" });

    const clearedAt = conversation.clearedAt?.get(userId) || null;

    const query = {
      conversation: conversationId,
      deletedForEveryone: false,
      deletedFor: { $ne: userId },
      ...(clearedAt && { createdAt: { $gt: clearedAt } }),
    };

    const messages = await Message.find(query)
      .populate("sender", "fullname username profileImage")
      .populate({
        path: "replyTo",
        select: "content sender deletedForEveryone attachments",
        populate: { path: "sender", select: "fullname username" },
      })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    await Conversation.findByIdAndUpdate(conversationId, {
      [`unreadCount.${userId}`]: 0,
    });

    return res.json({
      messages: messages.reverse(),
      page: Number(page),
      hasMore: messages.length === Number(limit),
    });
  } catch (err) {
    console.error("Get Messages Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ─────────────────────────────────────────
   GET CONVERSATIONS
───────────────────────────────────────── */
exports.getConversations = async (req, res) => {
  try {
    const userId = req.user.id;

    const conversations = await Conversation.find({ participants: userId })
      .populate("participants", "fullname username profileImage")
      .populate({
        path: "lastMessage",
        select: "content sender createdAt deletedForEveryone attachments",
        populate: { path: "sender", select: "fullname username" },
      })
      .sort({ updatedAt: -1 });

    const formatted = conversations.map((conv) => {
      const otherUser = conv.participants.find((p) => p._id.toString() !== userId);
      let lastMsg = conv.lastMessage;
      if (lastMsg?.deletedForEveryone) {
        lastMsg = { ...lastMsg.toObject(), content: "This message was deleted" };
      }
      return {
        id: conv._id,
        otherUser,
        lastMessage: lastMsg,
        unreadCount: conv.unreadCount?.get(userId) || 0,
        updatedAt: conv.updatedAt,
      };
    });

    return res.json(formatted);
  } catch (err) {
    console.error("Get Conversations Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ─────────────────────────────────────────
   MARK AS READ
───────────────────────────────────────── */
exports.markAsRead = async (req, res) => {
  try {
    const io = req.app.get("io");
    const userId = req.user.id;
    const { conversationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ message: "Invalid conversation ID" });
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
    });
    if (!conversation) return res.status(403).json({ message: "Access denied" });

    const now = new Date();

    await Message.updateMany(
      {
        conversation: conversationId,
        sender: { $ne: userId },
        "readBy.user": { $ne: userId },
        deletedForEveryone: false,
      },
      { $push: { readBy: { user: userId, readAt: now } } }
    );

    await Conversation.findByIdAndUpdate(conversationId, {
      [`unreadCount.${userId}`]: 0,
    });

    const otherUser = conversation.participants.find((p) => p.toString() !== userId);

    emitToUser(io, otherUser, "messages_read", {
      conversationId,
      readBy: userId,
      readAt: now,
    });

    return res.json({ message: "Marked as read" });
  } catch (err) {
    console.error("Mark Read Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ─────────────────────────────────────────
   EDIT MESSAGE
───────────────────────────────────────── */
exports.editMessage = async (req, res) => {
  try {
    const io = req.app.get("io");
    const userId = req.user.id;
    const { messageId } = req.params;
    const { content } = req.body;

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ message: "Invalid message ID" });
    }
    if (!content?.trim()) {
      return res.status(400).json({ message: "Content cannot be empty" });
    }
    if (content.trim().length > 5000) {
      return res.status(400).json({ message: "Message too long" });
    }

    const message = await Message.findOne({
      _id: messageId,
      sender: userId,
      deletedForEveryone: false,
      deletedFor: { $ne: userId },
    });
    if (!message) return res.status(404).json({ message: "Message not found or not yours" });

    const EDIT_WINDOW_MS = 15 * 60 * 1000;
    if (Date.now() - message.createdAt.getTime() > EDIT_WINDOW_MS) {
      return res.status(403).json({ message: "Edit window has expired (15 minutes)" });
    }

    message.content = content.trim();
    message.editedAt = new Date();
    await message.save();

    const conversation = await Conversation.findById(message.conversation);
    const otherUser = conversation.participants.find((p) => p.toString() !== userId);

    emitToUser(io, otherUser, "message_edited", {
      conversationId: message.conversation,
      messageId: message._id,
      newContent: message.content,
      editedAt: message.editedAt,
    });

    return res.json({ message });
  } catch (err) {
    console.error("Edit Message Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ─────────────────────────────────────────
   DELETE FOR ME
───────────────────────────────────────── */
exports.deleteMessageForMe = async (req, res) => {
  try {
    const userId = req.user.id;
    const { messageId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ message: "Invalid message ID" });
    }

    const message = await Message.findById(messageId).populate("conversation");
    if (!message) return res.status(404).json({ message: "Message not found" });

    const isParticipant = message.conversation.participants
      .map((p) => p.toString())
      .includes(userId);
    if (!isParticipant) return res.status(403).json({ message: "Access denied" });

    if (message.deletedFor.map((d) => d.toString()).includes(userId)) {
      return res.status(409).json({ message: "Already deleted for you" });
    }

    message.deletedFor.push(userId);
    await message.save();

    return res.json({ message: "Message deleted for you" });
  } catch (err) {
    console.error("Delete For Me Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ─────────────────────────────────────────
   DELETE FOR EVERYONE
───────────────────────────────────────── */
exports.deleteMessageForEveryone = async (req, res) => {
  try {
    const io = req.app.get("io");
    const userId = req.user.id;
    const { messageId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ message: "Invalid message ID" });
    }

    const message = await Message.findOne({
      _id: messageId,
      sender: userId,
      deletedForEveryone: false,
    });
    if (!message) return res.status(404).json({ message: "Message not found or not yours" });

    const DELETE_WINDOW_MS = 60 * 60 * 1000;
    if (Date.now() - message.createdAt.getTime() > DELETE_WINDOW_MS) {
      return res.status(403).json({ message: "Delete window expired (1 hour)" });
    }

    message.deletedForEveryone = true;
    message.content = "";
    await message.save();

    const conversation = await Conversation.findById(message.conversation);
    const otherUser = conversation.participants.find((p) => p.toString() !== userId);

    emitToUser(io, otherUser, "message_deleted", {
      conversationId: message.conversation,
      messageId: message._id,
    });

    return res.json({ message: "Message deleted for everyone" });
  } catch (err) {
    console.error("Delete For Everyone Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ─────────────────────────────────────────
   CLEAR CHAT
───────────────────────────────────────── */
exports.clearChat = async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ message: "Invalid conversation ID" });
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
    });
    if (!conversation) return res.status(403).json({ message: "Access denied" });

    await Conversation.findByIdAndUpdate(conversationId, {
      [`clearedAt.${userId}`]: new Date(),
      [`unreadCount.${userId}`]: 0,
    });

    return res.json({ message: "Chat cleared" });
  } catch (err) {
    console.error("Clear Chat Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ─────────────────────────────────────────
   TYPING INDICATOR
───────────────────────────────────────── */
exports.sendTypingIndicator = async (req, res) => {
  try {
    const io = req.app.get("io");
    const userId = req.user.id;
    const { conversationId } = req.params;
    const { isTyping } = req.body;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ message: "Invalid conversation ID" });
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
    });
    if (!conversation) return res.status(403).json({ message: "Access denied" });

    const otherUser = conversation.participants.find((p) => p.toString() !== userId);

    emitToUser(io, otherUser, "typing", {
      conversationId,
      userId,
      isTyping: Boolean(isTyping),
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error("Typing Indicator Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};