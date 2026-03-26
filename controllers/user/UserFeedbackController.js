const Feedback = require("../../models/Feedback.model");
const { User } = require("../../models/user.model"); // ← named export!

// POST /api/feedback — Submit new feedback

const submitFeedback = async (req, res) => {
  try {
    const { type, title, description } = req.body;

    const user = await User.findById(req.user._id).select("fullname email");
    if (!user) return res.status(404).json({ message: "User not found." });

    if (!type || !title || !description) {
      return res.status(400).json({ message: "type, title, and description are required." });
    }

    const feedback = await Feedback.create({
      userId: req.user._id,
      userName: user.fullname,  // ✅
      userEmail: user.email,    // ✅
      type,
      title,
      description,
    });

    res.status(201).json({ message: "Feedback submitted successfully.", feedback });
  } catch (err) {
    res.status(500).json({ message: "Server error.", error: err.message });
  }
};

// GET /api/feedback/my — Get current user's own feedback
const getMyFeedback = async (req, res) => {
  try {
    const feedbacks = await Feedback.find({ userId: req.user._id })
      .select("-adminNote") // hide adminNote from user
      .sort({ createdAt: -1 });

    res.status(200).json({ feedbacks });
  } catch (err) {
    res.status(500).json({ message: "Server error.", error: err.message });
  }
};

// GET /api/feedback/my/:id — Get single feedback by ID (user's own)
const getMyFeedbackById = async (req, res) => {
  try {
    const feedback = await Feedback.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).select("-adminNote");

    if (!feedback) {
      return res.status(404).json({ message: "Feedback not found." });
    }

    res.status(200).json({ feedback });
  } catch (err) {
    res.status(500).json({ message: "Server error.", error: err.message });
  }
};

module.exports = { submitFeedback, getMyFeedback, getMyFeedbackById };