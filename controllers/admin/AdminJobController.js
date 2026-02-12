// controllers/admin/job.controller.js
const mongoose = require("mongoose");
const Job = require("../../models/Job.models");

exports.getPendingJobs = async (req, res) => {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    /* ================= QUERY PARAMS ================= */

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 10, 50);
    const skip = (page - 1) * limit;

    const {
      employmentType,
      workMode,
      experienceLevel,
      city,
      search,
    } = req.query;

    /* ================= BASE FILTER ================= */

    const filter = { status: "pending" };

    if (employmentType) filter.employmentType = employmentType;
    if (workMode) filter.workMode = workMode;
    if (experienceLevel) filter.experienceLevel = experienceLevel;
    if (city) filter["location.city"] = new RegExp(`^${city}`, "i");

    if (search) {
      filter.$or = [
        { title: new RegExp(search, "i") },
        { companyName: new RegExp(search, "i") },
        { "postedBy.username": new RegExp(search, "i") },
        { "postedBy.email": new RegExp(search, "i") },
      ];
    }

    /* ================= QUERY ================= */

    const [jobs, total] = await Promise.all([
      Job.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Job.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: jobs,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      },
    });
  } catch (err) {
    console.error("ADMIN JOB FETCH ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch pending jobs",
    });
  }
};

exports.updatePendingJob = async (req, res) => {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job ID",
      });
    }

    const job = await Job.findOne({ _id: id, status: "pending" });
    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Only pending jobs can be edited",
      });
    }

    /* ================= ALLOWED FIELDS ================= */
    const allowedFields = [
      "title",
      "companyName",
      "employmentType",
      "workMode",
      "experienceLevel",
      "openings",
      "location",
      "salary",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        job[field] = req.body[field];
      }
    });

    await job.save();

    res.json({
      success: true,
      data: job,
    });
  } catch (err) {
    console.error("ADMIN EDIT JOB ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update job",
    });
  }
};

exports.updateJobStatus = async (req, res) => {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job ID",
      });
    }

    const { status } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    // ✅ enforce valid transition: pending → approved/rejected
    const job = await Job.findOneAndUpdate(
      { _id: id, status: "pending" },
      { status },
      { new: true }
    ).lean();

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found or already reviewed",
      });
    }

    res.json({
      success: true,
      data: job,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to update job status",
    });
  }
};

exports.createJobAsAdmin = async (req, res) => {
  try {
    // Only admin can use this endpoint
    if (req.user?.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can use this endpoint",
      });
    }

    const {
      title,
      companyName,
      employmentType,
      workMode,
      experienceLevel,
      openings = 1,
      location,
      salary,
    } = req.body;

    // Validation
    if (
      !title ||
      !companyName ||
      !employmentType ||
      !workMode ||
      !experienceLevel
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required job fields",
      });
    }

    if (!location?.city) {
      return res.status(400).json({
        success: false,
        message: "City is required",
      });
    }

    // Create job with admin as poster
    const job = await Job.create({
      title,
      companyName,
      employmentType,
      workMode,
      experienceLevel,
      openings,
      location,
      salary,
      status: "approved", // ✅ Auto-approved since posted by admin

      // Admin info as poster
      postedBy: {
        userId: req.user._id,
        username: req.user.username,
        email: req.user.email,
        stream: req.user.stream || "Admin",
        batch: req.user.batch || "N/A",
        role: "admin", 
      },
    });

    res.status(201).json({
      success: true,
      message: "Job created and auto-approved",
      data: job,
    });
  } catch (err) {
    console.error("ADMIN CREATE JOB ERROR:", err);
    res.status(400).json({
      success: false,
      message: err.message || "Failed to create job",
    });
  }
};