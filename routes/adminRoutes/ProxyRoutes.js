// routes/proxy.routes.js
const express = require("express");
const router  = express.Router();
const { proxyFile } = require("../../controllers/admin/ProxyController");
const {  authMiddleware}   = require("../../controllers/auth/authController"); // your existing auth middleware

// Protected — only logged-in users can proxy files
router.get("/file", authMiddleware, proxyFile);

module.exports = router;