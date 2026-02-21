const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    // Always exactly 2 participants (DM only, extend for groups later)
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],

    // Mirrors the Connection document — both must be connected
    connection: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Connection",
      required: true,
    },

    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    // Unread count per participant
    unreadCount: {
      type: Map,
      of: Number,
      default: {},
    },

    // Soft-delete per user ("clear chat")
    clearedAt: {
      type: Map,
      of: Date, // userId → timestamp; messages before this are hidden
      default: {},
    },
  },
  { timestamps: true }
);

// Ensure one conversation per connection (no duplicates)
conversationSchema.index({ connection: 1 }, { unique: true });

// Fast lookup by participant
conversationSchema.index({ participants: 1 });

module.exports =
  mongoose.models.Conversation ||
  mongoose.model("Conversation", conversationSchema);