const mongoose = require("mongoose");

const JobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 100,
    },

    companyName: {
      type: String,
      required: true,
      trim: true,
    },

    employmentType: {
      type: String,
      enum: ["full-time", "part-time", "internship", "contract"],
      required: true,
      index: true,
    },

    workMode: {
      type: String,
      enum: ["onsite", "remote", "hybrid"],
      required: true,
      index: true,
    },

    experienceLevel: {
      type: String,
      enum: ["fresher", "0-1", "1-3", "3-5", "5+"],
      required: true,
      index: true,
    },

    openings: {
      type: Number,
      min: 1,
      default: 1,
    },

    location: {
      city: {
        type: String,
        trim: true,
        index: true,
      },
      state: {
        type: String,
        trim: true,
      },
      country: {
        type: String,
        default: "India",
      },
    },

    salary: {
      disclosed: {
        type: Boolean,
        default: false,
      },
      min: {
        type: Number,
      },
      max: {
        type: Number,
      },
    },

    /* ===== SYSTEM FIELDS ===== */

    status: {
      type: String,
      enum: ["draft", "pending", "approved", "rejected", "expired", "closed"],
      default: "draft",
      index: true,
    },

    postedBy: {
      alumniId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },
      name: String,
      email: String,
      department: String,
      graduationYear: Number,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

/* ===== COMPOUND INDEXES FOR LISTING PERFORMANCE ===== */

// Most common user query: approved jobs, newest first
JobSchema.index({ status: 1, createdAt: -1 });

// Alumni dashboard
JobSchema.index({ "postedBy.alumniId": 1, createdAt: -1 });

module.exports = mongoose.model("Job", JobSchema);
