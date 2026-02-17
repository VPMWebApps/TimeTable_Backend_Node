const mongoose = require("mongoose");

const userInfoSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    jobTitle: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "",
    },

    company: {
      type: String,
      trim: true,
      maxlength: 150,
      default: "",
    },

    industry: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "",
    },

    about: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },

    linkedin: {
      type: String,
      trim: true,
      default: "",
    },

    profilePicture: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

// This is correct
userInfoSchema.index({ user: 1 });

const UserInfo =
  mongoose.models.UserInfo ||
  mongoose.model("UserInfo", userInfoSchema);

module.exports = UserInfo;
