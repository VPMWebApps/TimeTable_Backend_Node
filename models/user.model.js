const mongoose = require("mongoose");

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
      type: String,
      required: true,
      match: [/^[0-9]{4}$/, "Enter a valid 4-digit batch year"],
    },
    stream: {
      type: String,
      required: true,
      trim: true,
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
      default: "user",
    },
    lastLoginAt: {
      type: Date,
    }
  },
    
  { timestamps: true }
);

userSchema.index({ fullname: "text", username: "text", stream: "text" });


const User = mongoose.model("User", userSchema);

module.exports = User;