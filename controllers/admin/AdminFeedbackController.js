const Feedback = require("../../models/Feedback.model");

// GET /api/admin/feedback — Get all feedback with filters
const getAllFeedback = async (req, res) => {
  try {
    const { status, type, priority, search, page = 1, limit = 10 } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (priority) filter.priority = priority;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { userName: { $regex: search, $options: "i" } },
        { userEmail: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [feedbacks, total] = await Promise.all([
      Feedback.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Feedback.countDocuments(filter),
    ]);

    res.status(200).json({
      feedbacks,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error.", error: err.message });
  }
};

// GET /api/admin/feedback/:id — Get single feedback (full details)
const getFeedbackById = async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) return res.status(404).json({ message: "Feedback not found." });

    res.status(200).json({ feedback });
  } catch (err) {
    res.status(500).json({ message: "Server error.", error: err.message });
  }
};

// PATCH /api/admin/feedback/:id — Update status, priority, adminNote
const updateFeedback = async (req, res) => {
  try {
    const { status, priority, adminNote } = req.body;

    const allowed = {};
    if (status) allowed.status = status;
    if (priority) allowed.priority = priority;
    if (adminNote !== undefined) allowed.adminNote = adminNote;

    const feedback = await Feedback.findByIdAndUpdate(
      req.params.id,
      { $set: allowed },
      { new: true, runValidators: true }
    );

    if (!feedback) return res.status(404).json({ message: "Feedback not found." });

    res.status(200).json({ message: "Feedback updated.", feedback });
  } catch (err) {
    res.status(500).json({ message: "Server error.", error: err.message });
  }
};

// DELETE /api/admin/feedback/:id — Delete feedback
const deleteFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.findByIdAndDelete(req.params.id);
    if (!feedback) return res.status(404).json({ message: "Feedback not found." });

    res.status(200).json({ message: "Feedback deleted." });
  } catch (err) {
    res.status(500).json({ message: "Server error.", error: err.message });
  }
};

// GET /api/admin/feedback/stats — Summary counts for dashboard
const getFeedbackStats = async (req, res) => {
  try {
    const [statusStats, typeStats, priorityStats] = await Promise.all([
      Feedback.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Feedback.aggregate([{ $group: { _id: "$type", count: { $sum: 1 } } }]),
      Feedback.aggregate([{ $group: { _id: "$priority", count: { $sum: 1 } } }]),
    ]);

    res.status(200).json({ statusStats, typeStats, priorityStats });
  } catch (err) {
    res.status(500).json({ message: "Server error.", error: err.message });
  }
};

module.exports = {
  getAllFeedback,
  getFeedbackById,
  updateFeedback,
  deleteFeedback,
  getFeedbackStats,
};