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
      unique: true, // creates unique index
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
      unique: true, // creates unique index
      match: [/^[0-9]{10}$/, "Phone number must be 10 digits"],
    },

    email: {
      type: String,
      required: true,
      unique: true, // creates unique index
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Enter a valid email"],
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
    },

    role: {
      type: String,
      enum: ["user", "admin"],
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
   PERFORMANCE INDEXES
========================= */

// Directory filtering (stream + batch)
userSchema.index({ stream: 1, batch: 1 });

// Newest users sorting
userSchema.index({ createdAt: -1 });

// Name search/sorting
userSchema.index({ fullname: 1 });

const User = mongoose.models.User || mongoose.model("User", userSchema);

module.exports = { User, STREAMS };
