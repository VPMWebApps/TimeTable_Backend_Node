const express = require("express");
const router = express.Router();
const {getPendingJobs ,updateJobStatus, updatePendingJob, createJobAsAdmin, getAdminJobApplications } = require("../../controllers/admin/AdminJobController");
const { authMiddleware } = require("../../controllers/auth/authController");


router.use(authMiddleware);

router.get("/pending-jobs", getPendingJobs);
router.patch("/:id/status", updateJobStatus);
router.patch("/:id/edit", updatePendingJob);
router.post("/create", createJobAsAdmin);
router.get("/applications",getAdminJobApplications)



module.exports = router;
