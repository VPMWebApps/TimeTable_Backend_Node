const express = require("express");
const router = express.Router();
const { submitFeedback, getMyFeedback, getMyFeedbackById } = require("../../controllers/user/UserFeedbackController.js");
const { authMiddleware }  = require("../../controllers/auth/authController");

// All routes require authenticated user

router.use(authMiddleware)
router.post("/", submitFeedback);           // POST   /api/feedback
router.get("/my", getMyFeedback);           // GET    /api/feedback/my
router.get("/my/:id", getMyFeedbackById);   // GET    /api/feedback/my/:id

module.exports = router;