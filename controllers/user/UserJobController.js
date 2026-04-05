const Job = require("../../models/Job.models");

exports.createJob = async (req, res) => {

  console.log("JOB FROM DB 👉", Job);
  try {
    // anyone except admin
    if (!req.user || req.user.role === "admin") {
      return res.status(403).json({
        success: false,
        message: "Only users can post jobs",
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
      applicationType = "form",
      externalLink,
    } = req.body;

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

    if (!["external", "form"].includes(applicationType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid application type",
      });
    }

    if (applicationType === "external" && !externalLink) {
      return res.status(400).json({
        success: false,
        message: "External link is required for external application type",
      });
    }
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
      status: "pending",
      postedBy: {
        userId: req.user._id,
        username: req.user.username,
        email: req.user.email,
        stream: req.user.stream,
        batch: req.user.batch,
        role: req.user.role,
      },
    });

    res.status(201).json({
      success: true,
      message: "Job submitted for admin approval",
      data: job,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message || "Failed to create job",
    });
  }
};

exports.getPublicJobs = async (req, res) => {
  try {

    console.log("JOB FROM DB 👉", Job);

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 18, 50);

    const query = { status: "approved" };

    if (req.query.employmentType)
      query.employmentType = req.query.employmentType;

    if (req.query.workMode)
      query.workMode = req.query.workMode;

    if (req.query.experienceLevel)
      query.experienceLevel = req.query.experienceLevel;

    if (req.query.city)
      query["location.city"] = new RegExp(req.query.city, "i");

    if (req.query.search) {
      query.$or = [
        { title: new RegExp(req.query.search, "i") },
        { companyName: new RegExp(req.query.search, "i") },
      ];
    }

    const [jobs, total] = await Promise.all([
      Job.find(query)
        .select(
          "title companyName employmentType workMode experienceLevel location salary openings createdAt postedBy applicationType externalLink"
        )
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Job.countDocuments(query),
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
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch jobs",
    });
  }
};

