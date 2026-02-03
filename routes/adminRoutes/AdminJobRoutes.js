const express = require("express");
const router = express.Router();
const {getPendingJobs ,updateJobStatus } = require("../../controllers/admin/AdminJobController");


router.post("/admin/jobs", getPendingJobs);
router.patch("/admin/jobs/:id/status", getPendingJobs);


module.exports = router;
