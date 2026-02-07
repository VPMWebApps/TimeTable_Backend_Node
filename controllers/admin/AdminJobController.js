// controllers/admin/job.controller.js
const mongoose = require("mongoose");
const Job = require("../../models/Job.models");

exports.getPendingJobs = async (req, res) => {

  console.log("ADMIN REQ.USER =", req.user);

  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 20, 50);

    const [jobs, total] = await Promise.all([
      Job.find({ status: "pending" })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Job.countDocuments({ status: "pending" }),
    ]);

    res.json({
      success: true,
      data: jobs,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch pending jobs",
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
