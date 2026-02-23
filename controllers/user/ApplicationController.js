const Application = require("../../models/Application.model");
const Job = require("../../models/Job.models");
const { uploadFileToCloudinary } = require("../../helpers/Cloudinary");

/* ─────────────────────────────────────────────
   POST /api/user/jobs/alumni/jobs/apply
   Authenticated user applies to a form-type job
───────────────────────────────────────────── */
exports.applyToJob = async (req, res) => {
  try {
    const { jobId, message } = req.body;

    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!jobId || !message?.trim()) {
      return res.status(400).json({
        success: false,
        message: "jobId and message are required",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Resume file is required",
      });
    }

    const job = await Job.findById(jobId).lean();

    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    if (job.status !== "approved") {
      return res.status(400).json({
        success: false,
        message: "This job is not accepting applications",
      });
    }

    if (job.applicationType !== "form") {
      return res.status(400).json({
        success: false,
        message: "This job uses an external application link",
      });
    }

    if (job.postedBy.userId.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot apply to your own job posting",
      });
    }

    const existing = await Application.findOne({
      job: jobId,
      applicant: req.user._id,
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "You have already applied to this job",
      });
    }

    const cloudinaryResult = await uploadFileToCloudinary(
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname
    );

    const application = await Application.create({
      job: jobId,
      applicant: req.user._id,
      resume: {
        url: cloudinaryResult.secure_url,
        publicId: cloudinaryResult.public_id,
        originalName: req.file.originalname,
      },
      message: message.trim(),
      status: "pending",
    });

    res.status(201).json({
      success: true,
      message: "Application submitted successfully",
      data: application,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "You have already applied to this job",
      });
    }
    res.status(500).json({
      success: false,
      message: err.message || "Failed to submit application",
    });
  }
};

/* ─────────────────────────────────────────────────────────────
   GET /api/user/jobs/alumni/my-job-applications?page=1&limit=10

   Job poster view — returns the alumni's own posted jobs,
   each with paginated applicants + total count per job (badge).
─────────────────────────────────────────────────────────────── */
exports.getApplicationsForMyJobs = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const page  = Math.max(Number(req.query.page)  || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 10, 50);
    const skip  = (page - 1) * limit;

    /* 1. All approved jobs posted by this user */
    const myJobs = await Job.find({
      "postedBy.userId": req.user._id,
      status: "approved",
    })
      .select("_id title companyName employmentType workMode location createdAt")
      .sort({ createdAt: -1 })
      .lean();

    if (!myJobs.length) {
      return res.json({
        success: true,
        data: [],
        pagination: { total: 0, page, pages: 0, limit },
      });
    }

    const jobIds = myJobs.map((j) => j._id);

    /* 2. Total applications across all my jobs (for pagination) */
    const total = await Application.countDocuments({ job: { $in: jobIds } });

    /* 3. Paginated applications */
    const applications = await Application.find({ job: { $in: jobIds } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: "applicant", select: "fullname email stream batch" })
      .populate({ path: "job",       select: "_id title companyName" })
      .lean();

    /* 4. Group applications under each job */
    const jobMap = {};
    myJobs.forEach((job) => {
      jobMap[job._id.toString()] = { ...job, applications: [] };
    });

    applications.forEach((app) => {
      const key = app.job?._id?.toString();
      if (key && jobMap[key]) jobMap[key].applications.push(app);
    });

    /* 5. Per-job total count (for the badge on collapsed rows) */
    const countAgg = await Application.aggregate([
      { $match: { job: { $in: jobIds } } },
      { $group: { _id: "$job", count: { $sum: 1 } } },
    ]);

    const countMap = {};
    countAgg.forEach((c) => { countMap[c._id.toString()] = c.count; });

    /* 6. Only return jobs that have applications on this page */
    const data = Object.values(jobMap)
      .filter((j) => j.applications.length > 0)
      .map((j) => ({
        ...j,
        totalApplications: countMap[j._id.toString()] || 0,
      }));

    res.json({
      success: true,
      data,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || "Failed to fetch applications",
    });
  }
};

/* ─────────────────────────────────────────────
   GET /api/user/applications/my
   Applicant view — logged-in user's own submissions
───────────────────────────────────────────── */
exports.getMyApplications = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const applications = await Application.find({ applicant: req.user._id })
      .sort({ createdAt: -1 })
      .populate({
        path: "job",
        select: "title companyName employmentType workMode location salary status postedBy",
      })
      .lean();

    res.json({ success: true, data: applications });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || "Failed to fetch applications",
    });
  }
};