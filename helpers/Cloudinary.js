const { v2: cloudinary } = require("cloudinary");
const multer = require("multer");

cloudinary.config({
  cloud_name: "dbgldur3y",
  api_key: "374649195317325",
  api_secret:"s2-iP7VGgjGDCA9U_xAxgeYZ7j8",
});

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
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

// ── Upload any file to Cloudinary ──
async function uploadFileToCloudinary(fileBuffer, mimetype, originalname) {
  return new Promise((resolve, reject) => {
    const resourceType = mimetype.startsWith("image/") ? "image"
      : mimetype.startsWith("video/") ? "video"
      : mimetype.startsWith("audio/") ? "video" // Cloudinary uses "video" for audio too
      : "raw";

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "messages",
        resource_type: resourceType,
        public_id: `${Date.now()}_${originalname.replace(/\s+/g, "_")}`,
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    uploadStream.end(fileBuffer);
  });
}

// ── Legacy image helper (keep for other features) ──
async function handleImageUploadUtil(fileBuffer, mimetype) {
  const base64Data = Buffer.from(fileBuffer).toString("base64");
  const dataURI = `data:${mimetype};base64,${base64Data}`;
  const result = await cloudinary.uploader.upload(dataURI, {
    folder: "events",
    resource_type: "image",
  });
  return result;
}

module.exports = { cloudinary, upload, handleImageUploadUtil, uploadFileToCloudinary };

// const { v2: cloudinary } = require("cloudinary");
// const multer = require("multer");

// // Configure Cloudinary
// cloudinary.config({
//   cloud_name: "dbgldur3y",
//   api_key: "374649195317325",
//   api_secret:"s2-iP7VGgjGDCA9U_xAxgeYZ7j8",
// });

// const storage = multer.memoryStorage();
// const upload = multer({ storage });

// // ✅ Proper helper
// async function handleImageUploadUtil(fileBuffer, mimetype) {
//   const base64Data = Buffer.from(fileBuffer).toString("base64");
//   const dataURI = `data:${mimetype};base64,${base64Data}`;

//   const result = await cloudinary.uploader.upload(dataURI, {
//     folder: "events", // optional
//     resource_type: "image",
//   });

//   return result;
// }

// module.exports = { cloudinary, upload, handleImageUploadUtil };
