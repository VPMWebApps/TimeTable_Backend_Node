const express = require("express");
const router  = express.Router();
const {
  getApprovedAlbums,
  getAlbumPhotos,
  submitAlbum,
  getMyAlbums,
} = require("../../controllers/user/UserGalleryController");
const { upload }         = require("../../helpers/Cloudinary");
const { authMiddleware }  = require("../../controllers/auth/authController");


router.get("/albums",          getApprovedAlbums);
router.get("/albums/:id/photos", getAlbumPhotos);



router.post("/albums",        authMiddleware, upload.array("photos", 50), submitAlbum);
router.get( "/my-albums",  authMiddleware,    getMyAlbums);

module.exports = router;

