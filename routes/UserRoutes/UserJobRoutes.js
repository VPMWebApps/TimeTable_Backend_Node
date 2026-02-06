const express = require("express");
const router = express.Router();
const {createJob,getPublicJobs} = require("../../controllers/user/UserJobController");
const { authMiddleware } = require("../../controllers/auth/authController");


router.post("/alumni/jobs/create",authMiddleware, createJob  );
router.get("/alumni/jobs/get", getPublicJobs);


module.exports = router;
