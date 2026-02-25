const express = require("express");
const router = express.Router();
const {
  createNews,
  getAllNewsAdmin,
  getNewsById,
  updateNews,
  togglePublish,
  deleteNews,
} = require("../../controllers/admin/AdminNewsController");
const { upload } = require("../../helpers/Cloudinary");
const { authMiddleware } = require("../../controllers/auth/authController");

// All routes require admin auth
router.use(authMiddleware);

router.post(  "/",          upload.single("coverImage"), createNews);
router.get(   "/",          getAllNewsAdmin);
router.get(   "/:id",       getNewsById);
router.patch( "/:id",       upload.single("coverImage"), updateNews);
router.patch( "/:id/toggle-publish", togglePublish);
router.delete("/:id",       deleteNews);

module.exports = router;

/* ── Mount in app.js ─────────────────────────────────────────
   const newsAdminRoutes = require("./routes/admin/news.routes");
   app.use("/api/admin/news", newsAdminRoutes);
──────────────────────────────────────────────────────────── */