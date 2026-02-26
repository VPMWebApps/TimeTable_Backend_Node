const express = require("express");
const router  = express.Router();
const {
  getAllAlbums,
  createAlbum,
  approveAlbum,
  rejectAlbum,
  mergeAlbums,
  updateAlbum,
  deleteAlbum,
  getAlbumPhotos,
  addPhotos,
  deletePhoto,
  setCover,
} = require("../../controllers/admin/AdminGalleryController");
const { upload }          = require("../../helpers/Cloudinary");
const { authMiddleware }  = require("../../controllers/auth/authController");

router.use(authMiddleware);

/* Albums */
router.get(   "/albums",                              getAllAlbums);
router.post(  "/albums",        upload.array("photos", 50), createAlbum);
router.patch( "/albums/merge",                        mergeAlbums);
router.patch( "/albums/:id",    upload.single("coverImage"), updateAlbum);
router.patch( "/albums/:id/approve",                  approveAlbum);
router.patch( "/albums/:id/reject",                   rejectAlbum);
router.delete("/albums/:id",                          deleteAlbum);

/* Photos within album */
router.get(   "/albums/:id/photos",                   getAlbumPhotos);
router.post(  "/albums/:id/photos", upload.array("photos", 50), addPhotos);
router.patch( "/albums/:id/set-cover/:photoId",       setCover);
router.delete("/photos/:photoId",                     deletePhoto);

module.exports = router;

/* ── Mount in app.js ─────────────────────────────────────
   const galleryAdminRoutes = require("./routes/admin/gallery.admin.routes");
   app.use("/api/admin/gallery", galleryAdminRoutes);
──────────────────────────────────────────────────────── */