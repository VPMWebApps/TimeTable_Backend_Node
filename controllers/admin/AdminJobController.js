// controllers/admin/job.controller.js
const Job = require("../../models/Job.models");

exports.getPendingJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ status: "pending" })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: jobs,
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
    const { status } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status transition",
      });
    }

    const job = await Job.findOneAndUpdate(
      { _id: req.params.id, status: "pending" },
      { status },
      { new: true }
    );

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found or already reviewed",
      });
    }

    res.json({
      success: true,
      message: `Job ${status}`,
      data: job,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to update job status",
    });
  }
};

