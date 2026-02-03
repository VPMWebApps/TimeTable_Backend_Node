const express = require("express");
const router = express.Router();
const {createJob,getPublicJobs} = require("../../controllers/user/UserJobController");


router.post("/alumni/jobs", createJob);
router.get("/alumni/jobs/get", getPublicJobs);


module.exports = router;
