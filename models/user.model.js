const mongoose = require("mongoose");

const STREAMS = [
  "CSE",
  "MECH",
  "EEE",
  "ECE",
  "CIVIL",
  "IT",
  "CHEM",
  "AERO",
  "BIOTECH",
  "MBA",
];

const userSchema = new mongoose.Schema(
  {
    fullname: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
    },

    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
    },

    batch: {
      type: Number,
      required: true,
      min: 1900,
      max: 2100,
    },

    stream: {
      type: String,
      required: true,
      enum: STREAMS,
    },

    phoneno: {
      type: String,
      required: true,
      unique: true,
      match: [/^[0-9]{10}$/, "Phone number must be 10 digits"],
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Enter a valid email"],
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
    },

    role: {
      type: String,
      enum: ["user", "admin"], // 🔥 Don’t leave role open
      default: "user",
    },

    lastLoginAt: {
      type: Date,
    },
    loginCount: {           
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

/* =========================
   INDEXES
========================= */

// Filtering performance
userSchema.index({ stream: 1, batch: 1 });

// Sorting performance
userSchema.index({ createdAt: -1 });

// Text search (stream removed)
userSchema.index({
  fullname: "text",
  username: "text",
  email: "text",
});

const User = mongoose.models.User || mongoose.model("User", userSchema);

module.exports = { User, STREAMS };
