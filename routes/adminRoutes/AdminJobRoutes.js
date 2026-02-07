const express = require("express");
const router = express.Router();
const {getPendingJobs ,updateJobStatus } = require("../../controllers/admin/AdminJobController");
const { authMiddleware } = require("../../controllers/auth/authController");


router.use(authMiddleware);

router.get("/pending-jobs", getPendingJobs);
router.patch("/:id/status", updateJobStatus);


module.exports = router;
