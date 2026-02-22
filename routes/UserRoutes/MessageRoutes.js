const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../../controllers/auth/authController");
const {
  sendMessage, getMessages, getConversations, markAsRead,
  editMessage, deleteMessageForMe, deleteMessageForEveryone,
  clearChat, sendTypingIndicator,
} = require("../../controllers/user/MessageController");
const { upload } = require("../../helpers/Cloudinary");

router.get("/conversations", authMiddleware, getConversations);

// ── Send message with proper multer error handling ──
router.post("/send", authMiddleware, (req, res, next) => {
    upload.array("files", 5)(req, res, (err) => {
        if (err) {
            if (err.code === "LIMIT_FILE_SIZE") {
                return res.status(400).json({ message: "File too large. You can only share files up to 25MB." });
            }
            if (err.code === "LIMIT_FILE_COUNT") {
                return res.status(400).json({ message: "Too many files. Maximum is 5 files per message." });
            }
            if (err.message?.includes("not allowed")) {
                return res.status(400).json({ message: err.message });
            }
            return res.status(400).json({ message: "File upload error." });
        }
        next();
    });
}, sendMessage);

router.get("/:conversationId", authMiddleware, getMessages);
router.patch("/:conversationId/read", authMiddleware, markAsRead);
router.patch("/:messageId/edit", authMiddleware, editMessage);
router.delete("/:messageId/me", authMiddleware, deleteMessageForMe);
router.delete("/:messageId/everyone", authMiddleware, deleteMessageForEveryone);
router.delete("/:conversationId/clear", authMiddleware, clearChat);
router.post("/:conversationId/typing", authMiddleware, sendTypingIndicator);

module.exports = router;