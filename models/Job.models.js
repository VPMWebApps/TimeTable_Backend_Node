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
      city: { type: String, required: true, trim: true, index: true },
      state: { type: String, trim: true },
      country: { type: String, default: "India", required: true },
    },

    salary: {
      disclosed: { type: Boolean, default: false },
      min: Number,
      max: Number,
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "expired", "closed"],
      default: "pending",
      index: true,
    },
    postedBy: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },
      username: { type: String, required: true },
      email: { type: String, required: true },
      stream: { type: String, required: true },
      batch: {
        type: String,
        required: true,
        match: [/^[0-9]{4}$/, "Invalid batch year"],
      },
      role: {
        type: String,
        enum: ["user", "admin"],
        required: true
      },
    },
    applicationType: {
      type: String,
      enum: ["external", "form"],
      required: true,
      default: "form",
      index: true,
    },

    externalLink: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true, versionKey: false }
);

/* ================= SALARY CONSISTENCY ================= */

JobSchema.pre("validate", function (next) {
  if (!this.salary?.disclosed) {
    this.salary.min = undefined;
    this.salary.max = undefined;
  } else if (
    this.salary.min != null &&
    this.salary.max != null &&
    this.salary.min > this.salary.max
  ) {
    return next(new Error("Salary min cannot exceed max"));
  }
  next();
});

/* ================= INDEXES ================= */

JobSchema.index({ status: 1, createdAt: -1 });
JobSchema.index({ "postedBy.userId": 1, createdAt: -1 });
JobSchema.index({
  title: "text",
  companyName: "text",
  "postedBy.username": "text",
  "postedBy.email": "text",
});


module.exports = mongoose.model("Job", JobSchema);
