const express = require("express");
const multer = require("multer");
const {
  handleImageUpload,
  addEvent,
  fetchEvent,
  updateEvent,
  deleteEvent,
  getEventRegistrations,

} = require("../../controllers/admin/AdminEventController");
const { authMiddleware } = require("../../controllers/auth/authController");


const router = express.Router();
const upload = multer();
router.use(authMiddleware);

router.post("/upload-image", upload.single("my_file"), handleImageUpload);
router.post("/add", addEvent);
router.get("/get", fetchEvent);
router.put("/update/:id", updateEvent);
router.delete("/delete/:id", deleteEvent);

router.get("/get/registration", getEventRegistrations)

module.exports = router;
