const express = require("express");
const router = express.Router();
const {
  getAllFeedback,
  getFeedbackById,
  updateFeedback,
  deleteFeedback,
  getFeedbackStats,
} = require("../../controllers/admin/AdminFeedbackController");

// All routes require authenticated admin

router.get("/stats", getFeedbackStats);       // GET    /api/admin/feedback/stats
router.get("/", getAllFeedback);               // GET    /api/admin/feedback
router.get("/:id", getFeedbackById);          // GET    /api/admin/feedback/:id
router.patch("/:id", updateFeedback);         // PATCH  /api/admin/feedback/:id
router.delete("/:id", deleteFeedback);        // DELETE /api/admin/feedback/:id

module.exports = router;