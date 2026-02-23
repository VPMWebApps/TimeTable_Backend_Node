const express = require("express");
const router = express.Router();
const { createJob, getPublicJobs } = require("../../controllers/user/UserJobController");
const { authMiddleware } = require("../../controllers/auth/authController");
const { upload } = require("../../helpers/Cloudinary");
const { applyToJob, getMyApplications, getApplicationsForMyJobs } = require("../../controllers/user/ApplicationController");


router.post("/alumni/jobs/create", authMiddleware, createJob);
router.get("/alumni/jobs/get", authMiddleware, getPublicJobs);


//apply routes
router.post(
    "/alumni/jobs/apply",
    upload.single("resume"),
    authMiddleware,
    applyToJob
);

router.get(
    "/alumni/applications",
    authMiddleware,
    getApplicationsForMyJobs
);

router.get("/alumni/applications/alumni", authMiddleware, getMyApplications);


module.exports = router;
