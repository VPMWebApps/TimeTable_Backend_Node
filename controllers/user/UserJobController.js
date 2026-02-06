// controllers/user/job.controller.js
const Job = require("../../models/Job.models");

exports.createJob = async (req, res) => {
  try {

    console.log("USER:", req.user);


    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const user = req.user;


    const job = await Job.create({
      ...req.body,
      status: "pending",
      postedBy: {
        alumniId: user._id,
        name: user.username,
        email: user.email,
        role: user.role
      }
    });


    return res.status(201).json({
      success: true,
      message: "Job submitted for admin approval",
      data: job,
    });
  } catch (error) {
    console.error("Alumni create job error:", error);

    // 🧠 Handle mongoose validation errors cleanly
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Invalid job data",
        errors: Object.values(error.errors).map((e) => e.message),
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to submit job",
    });
  }
};

exports.getPublicJobs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      employmentType,
      workMode,
      experienceLevel,
      city,
      search,
    } = req.query;

    const filter = { status: "approved" }; // 🔐 backend enforcement

    if (employmentType) filter.employmentType = employmentType;
    if (workMode) filter.workMode = workMode;
    if (experienceLevel) filter.experienceLevel = experienceLevel;
    if (city) filter["location.city"] = city;

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { companyName: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [jobs, total] = await Promise.all([
      Job.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),

      Job.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: jobs,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Public jobs error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch jobs",
    });
  }
};
