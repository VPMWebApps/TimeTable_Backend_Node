const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },

    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    content: {
      type: String,
      trim: true,
      maxlength: 5000,
    },

    // For future: images, files, etc.
    attachments: [
      {
        url: { type: String, required: true },
        type: { type: String, enum: ["image", "file", "audio", "video"], required: true },
        name: { type: String },
        size: { type: Number }, // bytes
      },
    ],

    // Soft delete — per user (e.g. "delete for me")
    deletedFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // "Deleted for everyone"
    deletedForEveryone: {
      type: Boolean,
      default: false,
    },

    // Read receipts
    readBy: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        readAt: { type: Date, default: Date.now },
      },
    ],

    // Reply threading
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    // Edit history
    editedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Indexes for fast queries
messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });

module.exports =
  mongoose.models.Message || mongoose.model("Message", messageSchema);