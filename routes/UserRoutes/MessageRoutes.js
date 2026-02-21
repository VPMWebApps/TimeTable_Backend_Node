const express = require("express");
const router = express.Router();
const {authMiddleware} = require("../../controllers/auth/authController");


const {
  sendMessage,
  getMessages,
  getConversations,
  markAsRead,
  editMessage,
  deleteMessageForMe,
  deleteMessageForEveryone,
  clearChat,
  sendTypingIndicator,
} = require("../../controllers/user/MessageController");

router.use(authMiddleware);

router.post("/send",                              sendMessage);
router.get("/conversations",                      getConversations);
router.get("/:conversationId",                    getMessages);
router.patch("/:conversationId/read",             markAsRead);
router.patch("/:messageId/edit",                  editMessage);
router.delete("/:messageId/me",                   deleteMessageForMe);
router.delete("/:messageId/everyone",             deleteMessageForEveryone);
router.delete("/:conversationId/clear",           clearChat);
router.post("/:conversationId/typing",            sendTypingIndicator);

module.exports = router;