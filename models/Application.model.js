const mongoose = require("mongoose");

const ApplicationSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      index: true,
    },

    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    resume: {
      url: { type: String, required: true },       // Cloudinary secure_url
      publicId: { type: String, required: true },  // Cloudinary public_id (for deletion later)
      originalName: { type: String, required: true },
    },

    message: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 1000,
    },

    status: {
      type: String,
      enum: ["pending", "reviewed", "shortlisted", "rejected"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true, versionKey: false }
);

/* ── Prevent duplicate applications (one per user per job) ── */
ApplicationSchema.index({ job: 1, applicant: 1 }, { unique: true });

/* ── Compound index for fetching user's applications sorted by date ── */
ApplicationSchema.index({ applicant: 1, createdAt: -1 });

module.exports = mongoose.model("Application", ApplicationSchema);