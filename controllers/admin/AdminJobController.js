// controllers/admin/job.controller.js
const mongoose = require("mongoose");
const Job = require("../../models/Job.models");
const Application = require("../../models/Application.model");

exports.getPendingJobs = async (req, res) => {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const page  = Math.max(Number(req.query.page)  || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 10, 50);
    const skip  = (page - 1) * limit;

    const { employmentType, workMode, experienceLevel, city, search } = req.query;

    const filter = { status: "pending" };

    if (employmentType)  filter.employmentType        = employmentType;
    if (workMode)        filter.workMode              = workMode;
    if (experienceLevel) filter.experienceLevel       = experienceLevel;
    if (city)            filter["location.city"]      = new RegExp(`^${city}`, "i");

    if (search) {
      filter.$or = [
        { title:               new RegExp(search, "i") },
        { companyName:         new RegExp(search, "i") },
        { "postedBy.username": new RegExp(search, "i") },
        { "postedBy.email":    new RegExp(search, "i") },
      ];
    }

    const [jobs, total] = await Promise.all([
      Job.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Job.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: jobs,
      pagination: { total, page, pages: Math.ceil(total / limit), limit },
    });
  } catch (err) {
    console.error("ADMIN JOB FETCH ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to fetch pending jobs" });
  }
};

exports.updatePendingJob = async (req, res) => {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid job ID" });
    }

    const job = await Job.findOne({ _id: id, status: "pending" });
    if (!job) {
      return res.status(404).json({ success: false, message: "Only pending jobs can be edited" });
    }

    const allowedFields = [
      "title", "companyName", "employmentType", "workMode",
      "experienceLevel", "openings", "location", "salary",
      "applicationType", "externalLink", // ✅ added
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) job[field] = req.body[field];
    });

    // Clear externalLink if switching back to form
    if (job.applicationType === "form") job.externalLink = undefined;

    await job.save();

    res.json({ success: true, data: job });
  } catch (err) {
    console.error("ADMIN EDIT JOB ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to update job" });
  }
};

exports.updateJobStatus = async (req, res) => {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid job ID" });
    }

    const { status } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const job = await Job.findOneAndUpdate(
      { _id: id, status: "pending" },
      { status },
      { new: true }
    ).lean();

    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found or already reviewed" });
    }

    res.json({ success: true, data: job });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update job status" });
  }
};

exports.createJobAsAdmin = async (req, res) => {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ success: false, message: "Only admins can use this endpoint" });
    }

    const {
      title, companyName, employmentType, workMode, experienceLevel,
      openings = 1, location, salary,
      applicationType = "form", externalLink,
    } = req.body;

    if (!title || !companyName || !employmentType || !workMode || !experienceLevel) {
      return res.status(400).json({ success: false, message: "Missing required job fields" });
    }

    if (!location?.city) {
      return res.status(400).json({ success: false, message: "City is required" });
    }

    if (!["external", "form"].includes(applicationType)) {
      return res.status(400).json({ success: false, message: "Invalid application type" });
    }

    if (applicationType === "external" && !externalLink) {
      return res.status(400).json({ success: false, message: "External link is required" });
    }

    // ✅ Use the current year as batch — satisfies /^[0-9]{4}$/ regex
    const currentYear = new Date().getFullYear().toString();

    const job = await Job.create({
      title,
      companyName,
      employmentType,
      workMode,
      experienceLevel,
      openings,
      location,
      salary,
      applicationType,
      externalLink: applicationType === "external" ? externalLink : undefined,
      status: "approved",
      postedBy: {
        userId:   req.user._id,
        username: req.user.username,
        email:    req.user.email,
        stream:   req.user.stream || "Administration",
        batch:    req.user.batch  || currentYear, // ✅ valid 4-digit year, not "N/A"
        role:     "admin",
      },
    });

    res.status(201).json({
      success: true,
      message: "Job created and auto-approved",
      data: job,
    });
  } catch (err) {
    console.error("ADMIN CREATE JOB ERROR:", err);
    res.status(400).json({ success: false, message: err.message || "Failed to create job" });
  }
};


exports.getAdminJobApplications = async (req, res) => {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const page  = Math.max(Number(req.query.page)  || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 10, 50);
    const skip  = (page - 1) * limit;

    // All jobs posted by this admin
    const adminJobs = await Job.find({ "postedBy.userId": req.user._id })
      .select("_id title companyName createdAt")
      .sort({ createdAt: -1 })
      .lean();

    if (!adminJobs.length) {
      return res.json({
        success: true,
        data: [],
        pagination: { total: 0, page, pages: 0, limit },
      });
    }

    const jobIds = adminJobs.map((j) => j._id);

    const total = await Application.countDocuments({ job: { $in: jobIds } });

    const applications = await Application.find({ job: { $in: jobIds } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: "applicant", select: "fullname email stream batch" })
      .populate({ path: "job", select: "_id title companyName" })
      .lean();

    // Group under each job
    const jobMap = {};
    adminJobs.forEach((job) => {
      jobMap[job._id.toString()] = { ...job, applications: [] };
    });

    applications.forEach((app) => {
      const key = app.job?._id?.toString();
      if (key && jobMap[key]) jobMap[key].applications.push(app);
    });

    // Per-job badge counts
    const countAgg = await Application.aggregate([
      { $match: { job: { $in: jobIds } } },
      { $group: { _id: "$job", count: { $sum: 1 } } },
    ]);

    const countMap = {};
    countAgg.forEach((c) => { countMap[c._id.toString()] = c.count; });

    const data = Object.values(jobMap)
      .filter((j) => j.applications.length > 0)
      .map((j) => ({
        ...j,
        totalApplications: countMap[j._id.toString()] || 0,
      }));

    res.json({
      success: true,
      data,
      pagination: { total, page, pages: Math.ceil(total / limit), limit },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || "Failed to fetch applications",
    });
  }
};