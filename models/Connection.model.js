const mongoose = require("mongoose");

const connectionSchema = new mongoose.Schema(
  {
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    status: {
      type: String,
      enum: ["PENDING", "ACCEPTED", "REJECTED", "BLOCKED"],
      default: "PENDING",
      required: true,
    },

    respondedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

/* =========================
   INDEXES
========================= */

// Prevent duplicate connections
connectionSchema.index(
  { requester: 1, recipient: 1 },
  { unique: true }
);

// Query: all sent requests by user
connectionSchema.index({ requester: 1, status: 1 });

// Query: all received requests by user
connectionSchema.index({ recipient: 1, status: 1 });

module.exports =
  mongoose.models.Connection ||
  mongoose.model("Connection", connectionSchema);
