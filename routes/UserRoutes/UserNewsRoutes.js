const express = require("express");
const router  = express.Router();
const {
  getPublicNews,
  getPublicNewsById,
  getLatestNews,
} = require("../../controllers/user/UserNewController");


/* Public — no auth required */
router.get("/latest", getLatestNews);      // GET /api/user/news/latest
router.get("/",       getPublicNews);      // GET /api/user/news
router.get("/:id",    getPublicNewsById);  // GET /api/user/news/:id

module.exports = router;

/* ── Mount in app.js ────────────────────────────────────────
   const newsUserRoutes = require("./routes/user/news.user.routes");
   app.use("/api/user/news", newsUserRoutes);
────────────────────────────────────────────────────────── */