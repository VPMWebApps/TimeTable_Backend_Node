const GalleryAlbum = require("../../models/GalleryAlbumn.model");
const GalleryPhoto = require("../../models/GalleryPhoto.model");
const { handleImageUploadUtil, uploadGalleryPhoto } = require("../../helpers/Cloudinary");

/* ─────────────────────────────────────────────────────────────
   GET /api/user/gallery/albums
   Browse approved albums (public feed)
───────────────────────────────────────────────────────────── */
exports.getApprovedAlbums = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 21,21);
    const skip = (page - 1) * limit;

    const query = { status: "approved" };
    if (req.query.search) query.title = new RegExp(req.query.search, "i");

    const [albums, total] = await Promise.all([
      GalleryAlbum.find(query)
        .sort({ eventDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("title description coverImage eventDate photoCount tags uploadedBy createdAt")
        .lean(),
      GalleryAlbum.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: albums,
      pagination: { total, page, pages: Math.ceil(total / limit), limit },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   GET /api/user/gallery/albums/:id/photos
   Photos inside an approved album
───────────────────────────────────────────────────────────── */
exports.getAlbumPhotos = async (req, res) => {
  try {
    const album = await GalleryAlbum.findOne({ _id: req.params.id, status: "approved" }).lean();
    if (!album) return res.status(404).json({ success: false, message: "Album not found" });

    const photos = await GalleryPhoto.find({ albumId: req.params.id })
      .sort({ createdAt: 1 })
      .select("url publicId caption createdAt")
      .lean();

    res.json({ success: true, data: { album, photos } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   POST /api/user/gallery/albums
   User submits a folder → status = "pending"
   Body: title, description, eventDate, tags[]
   Files: photos[] (multipart, up to 50)
───────────────────────────────────────────────────────────── */
exports.submitAlbum = async (req, res) => {
    console.log("FILES RECEIVED:", req.files?.length, req.files?.map(f => f.originalname));

  try {
    const { title, description, eventDate, tags } = req.body;

    if (!title?.trim())
      return res.status(400).json({ success: false, message: "Title is required" });
    if (!req.files?.length)
      return res.status(400).json({ success: false, message: "Please upload at least one photo" });
    if (req.files.length > 50)
      return res.status(400).json({ success: false, message: "Maximum 50 photos per submission" });

    const uploadResults = [];

    for (const file of req.files) {
      try {
        // ✅ Use uploadGalleryPhoto, not uploadFileToCloudinary
        const result = await uploadGalleryPhoto(file.buffer, file.mimetype);
        uploadResults.push(result);
      } catch (err) {
        console.error("Upload failed:", file.originalname, err.message);
        return res.status(500).json({
          success: false,
          message: `Failed uploading ${file.originalname}`,
        });
      }
    }

    const cover = uploadResults[0];

    const album = await GalleryAlbum.create({
      title: title.trim(),
      description: description?.trim() || "",
      coverImage: { url: cover.secure_url, publicId: cover.public_id },
      eventDate: eventDate ? new Date(eventDate) : null,
      tags: tags ? (Array.isArray(tags) ? tags : JSON.parse(tags)) : [],
      status: "pending",
      uploadedBy: {
        userId: req.user._id,
        name: req.user.fullname || req.user.username || "Alumni",
        role: "user",
      },
      photoCount: uploadResults.length,
    });

    const photos = uploadResults.map((r) => ({
      albumId: album._id,
      url: r.secure_url,
      publicId: r.public_id,
      uploadedBy: {
        userId: req.user._id,
        name: req.user.fullname || req.user.username || "Alumni",
      },
    }));

    await GalleryPhoto.insertMany(photos);

    res.status(201).json({
      success: true,
      message: "Album submitted for review!",
      data: album,
    });
  } catch (err) {
    console.error("submitAlbum error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
/* ─────────────────────────────────────────────────────────────
   GET /api/user/gallery/my-albums
   User's own submissions (all statuses)
───────────────────────────────────────────────────────────── */
exports.getMyAlbums = async (req, res) => {
  try {
    const albums = await GalleryAlbum.find({ "uploadedBy.userId": req.user._id })
      .sort({ createdAt: -1 })
      .select("title coverImage eventDate photoCount status rejectionReason createdAt")
      .lean();
    res.json({ success: true, data: albums });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};