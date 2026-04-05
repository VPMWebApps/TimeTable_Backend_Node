const { v2: cloudinary } = require("cloudinary");
const multer = require("multer");
require("dotenv").config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      "image/jpeg", "image/png", "image/gif", "image/webp",
      "video/mp4", "video/webm", "video/quicktime",
      "audio/mpeg", "audio/wav", "audio/ogg", "audio/webm",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`), false);
    }
  },
});

async function uploadFileToCloudinary(fileBuffer, mimetype, originalname) {
  return new Promise((resolve, reject) => {
    // ✅ KEY FIX: Use "image" resource_type for PDFs (not "raw")
    // Cloudinary serves "raw" assets as private/authenticated by default.
    // "image" resource_type makes PDFs publicly accessible via their URL
    // AND enables Cloudinary's inline delivery (no auth required).
    const resourceType = mimetype.startsWith("image/") ? "image"
      : mimetype.startsWith("video/") ? "video"
        : mimetype.startsWith("audio/") ? "video"
          : mimetype === "application/pdf" ? "image"  // ← PDFs use "image", not "raw"
            : "raw";

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "resumes",
        resource_type: resourceType,
        public_id: `${Date.now()}_${originalname.replace(/\s+/g, "_").replace(/\.[^/.]+$/, "")}`,
        flags: "attachment:false", // serve inline
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    uploadStream.end(fileBuffer);
  });
}

async function uploadGalleryPhoto(fileBuffer, mimetype) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "gallery",
        resource_type: "image",
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    uploadStream.end(fileBuffer);
  });
}

async function handleImageUploadUtil(fileBuffer, mimetype) {
  const base64Data = Buffer.from(fileBuffer).toString("base64");
  const dataURI = `data:${mimetype};base64,${base64Data}`;
  const result = await cloudinary.uploader.upload(dataURI, {
    folder: "events",
    resource_type: "image",
  });
  return result;
}

module.exports = { cloudinary, upload, handleImageUploadUtil, uploadFileToCloudinary, uploadGalleryPhoto };