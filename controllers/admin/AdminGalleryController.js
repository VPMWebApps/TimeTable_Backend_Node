const GalleryAlbum = require("../../models/GalleryAlbumn.model");
const GalleryPhoto = require("../../models/GalleryPhoto.model");
const { handleImageUploadUtil } = require("../../helpers/Cloudinary");

/* ══════════════════════════════════════════════════════════════
   ALBUMS
══════════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────
   GET /api/admin/gallery/albums
   List all albums (any status) with pagination + filters
───────────────────────────────────────────────────────── */
exports.getAllAlbums = async (req, res) => {
  try {
    const page  = Math.max(Number(req.query.page)  || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 12, 50);
    const skip  = (page - 1) * limit;

    const query = {};
    if (req.query.status) query.status = req.query.status;
    if (req.query.search) query.title  = new RegExp(req.query.search, "i");

    const [albums, total] = await Promise.all([
      GalleryAlbum.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      GalleryAlbum.countDocuments(query),
    ]);

    // Pending count for badge
    const pendingCount = await GalleryAlbum.countDocuments({ status: "pending" });

    res.json({
      success: true,
      data: albums,
      pendingCount,
      pagination: { total, page, pages: Math.ceil(total / limit), limit },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ─────────────────────────────────────────────────────
   POST /api/admin/gallery/albums
   Admin creates album + uploads photos in one shot
   Body: title, description, eventDate, tags[]
   Files: photos[] (multipart)
───────────────────────────────────────────────────────── */
exports.createAlbum = async (req, res) => {
  try {
    const { title, description, eventDate, tags } = req.body;
    if (!title?.trim()) return res.status(400).json({ success: false, message: "Title is required" });
    if (!req.files?.length) return res.status(400).json({ success: false, message: "At least one photo is required" });

    // Upload all photos to Cloudinary
    const uploadResults = await Promise.all(
      req.files.map((f) => handleImageUploadUtil(f.buffer, f.mimetype))
    );

    // First image becomes cover
    const cover = uploadResults[0];

    const album = await GalleryAlbum.create({
      title:       title.trim(),
      description: description?.trim() || "",
      coverImage:  { url: cover.secure_url, publicId: cover.public_id },
      eventDate:   eventDate ? new Date(eventDate) : null,
      tags:        tags ? (Array.isArray(tags) ? tags : JSON.parse(tags)) : [],
      status:      "approved", // admin uploads are auto-approved
      uploadedBy: {
        userId: req.user._id,
        name:   req.user.fullname || req.user.username || "Admin",
        role:   "admin",
      },
      photoCount: uploadResults.length,
    });

    // Bulk insert photos
    const photos = uploadResults.map((r) => ({
      albumId:    album._id,
      url:        r.secure_url,
      publicId:   r.public_id,
      uploadedBy: { userId: req.user._id, name: req.user.fullname || req.user.username || "Admin" },
    }));
    await GalleryPhoto.insertMany(photos);

    res.status(201).json({ success: true, message: "Album created", data: album });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ─────────────────────────────────────────────────────
   PATCH /api/admin/gallery/albums/:id/approve
───────────────────────────────────────────────────────── */
exports.approveAlbum = async (req, res) => {
  try {
    const album = await GalleryAlbum.findByIdAndUpdate(
      req.params.id,
      { status: "approved", rejectionReason: "" },
      { new: true }
    );
    if (!album) return res.status(404).json({ success: false, message: "Album not found" });
    res.json({ success: true, message: "Album approved", data: album });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ─────────────────────────────────────────────────────
   PATCH /api/admin/gallery/albums/:id/reject
   Body: { reason }
───────────────────────────────────────────────────────── */
exports.rejectAlbum = async (req, res) => {
  try {
    const album = await GalleryAlbum.findByIdAndUpdate(
      req.params.id,
      { status: "rejected", rejectionReason: req.body.reason || "Does not meet guidelines" },
      { new: true }
    );
    if (!album) return res.status(404).json({ success: false, message: "Album not found" });
    res.json({ success: true, message: "Album rejected", data: album });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ─────────────────────────────────────────────────────
   POST /api/admin/gallery/albums/merge
   Body: { albumIds: [id, id, ...], title, description }
   Merges N albums → new album. Source albums are deleted.
───────────────────────────────────────────────────────── */
exports.mergeAlbums = async (req, res) => {
  try {
    const { albumIds, title, description, eventDate, tags } = req.body;
    if (!albumIds?.length || albumIds.length < 2)
      return res.status(400).json({ success: false, message: "Select at least 2 albums to merge" });
    if (!title?.trim())
      return res.status(400).json({ success: false, message: "Title for merged album is required" });

    // Fetch source albums
    const sources = await GalleryAlbum.find({ _id: { $in: albumIds } }).lean();
    if (sources.length !== albumIds.length)
      return res.status(400).json({ success: false, message: "One or more albums not found" });

    // Use first source's cover
    const cover = sources[0].coverImage;
    const totalPhotos = sources.reduce((sum, a) => sum + a.photoCount, 0);

    // Create merged album
    const merged = await GalleryAlbum.create({
      title:       title.trim(),
      description: description?.trim() || "",
      coverImage:  cover,
      eventDate:   eventDate ? new Date(eventDate) : sources[0].eventDate,
      tags:        tags ? (Array.isArray(tags) ? tags : JSON.parse(tags)) : [],
      status:      "approved",
      uploadedBy:  { userId: req.user._id, name: req.user.fullname || "Admin", role: "admin" },
      mergedFrom:  albumIds,
      photoCount:  totalPhotos,
    });

    // Re-parent all photos to new merged album
    await GalleryPhoto.updateMany(
      { albumId: { $in: albumIds } },
      { albumId: merged._id }
    );

    // Delete source albums
    await GalleryAlbum.deleteMany({ _id: { $in: albumIds } });

    res.json({ success: true, message: `${sources.length} albums merged successfully`, data: merged });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ─────────────────────────────────────────────────────
   PATCH /api/admin/gallery/albums/:id
   Edit album metadata (title, description, eventDate, tags)
───────────────────────────────────────────────────────── */
exports.updateAlbum = async (req, res) => {
  try {
    const { title, description, eventDate, tags } = req.body;
    const album = await GalleryAlbum.findById(req.params.id);
    if (!album) return res.status(404).json({ success: false, message: "Album not found" });

    if (title !== undefined)       album.title       = title.trim();
    if (description !== undefined) album.description = description.trim();
    if (eventDate !== undefined)   album.eventDate   = eventDate ? new Date(eventDate) : null;
    if (tags !== undefined)        album.tags        = Array.isArray(tags) ? tags : JSON.parse(tags);

    // Replace cover if new file uploaded
    if (req.file) {
      const r    = await handleImageUploadUtil(req.file.buffer, req.file.mimetype);
      album.coverImage = { url: r.secure_url, publicId: r.public_id };
    }

    await album.save();
    res.json({ success: true, message: "Album updated", data: album });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ─────────────────────────────────────────────────────
   DELETE /api/admin/gallery/albums/:id
   Deletes album + all its photos
───────────────────────────────────────────────────────── */
exports.deleteAlbum = async (req, res) => {
  try {
    const album = await GalleryAlbum.findByIdAndDelete(req.params.id);
    if (!album) return res.status(404).json({ success: false, message: "Album not found" });
    await GalleryPhoto.deleteMany({ albumId: req.params.id });
    res.json({ success: true, message: "Album and photos deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ══════════════════════════════════════════════════════════════
   PHOTOS
══════════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────
   GET /api/admin/gallery/albums/:id/photos
───────────────────────────────────────────────────────── */
exports.getAlbumPhotos = async (req, res) => {
  try {
    const photos = await GalleryPhoto.find({ albumId: req.params.id })
      .sort({ createdAt: 1 })
      .lean();
    res.json({ success: true, data: photos });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ─────────────────────────────────────────────────────
   POST /api/admin/gallery/albums/:id/photos
   Add photos to existing album
   Files: photos[]
───────────────────────────────────────────────────────── */
exports.addPhotos = async (req, res) => {
  try {
    const album = await GalleryAlbum.findById(req.params.id);
    if (!album) return res.status(404).json({ success: false, message: "Album not found" });
    if (!req.files?.length) return res.status(400).json({ success: false, message: "No files uploaded" });

    const uploadResults = await Promise.all(
      req.files.map((f) => handleImageUploadUtil(f.buffer, f.mimetype))
    );

    const photos = uploadResults.map((r) => ({
      albumId:    album._id,
      url:        r.secure_url,
      publicId:   r.public_id,
      uploadedBy: { userId: req.user._id, name: req.user.fullname || "Admin" },
    }));

    await GalleryPhoto.insertMany(photos);

    // Update cover if album had none, update photoCount
    const updates = { $inc: { photoCount: photos.length } };
    if (!album.coverImage?.url) {
      updates.$set = { coverImage: { url: uploadResults[0].secure_url, publicId: uploadResults[0].public_id } };
    }
    await GalleryAlbum.findByIdAndUpdate(album._id, updates);

    res.json({ success: true, message: `${photos.length} photos added`, count: photos.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ─────────────────────────────────────────────────────
   DELETE /api/admin/gallery/photos/:photoId
───────────────────────────────────────────────────────── */
exports.deletePhoto = async (req, res) => {
  try {
    const photo = await GalleryPhoto.findByIdAndDelete(req.params.photoId);
    if (!photo) return res.status(404).json({ success: false, message: "Photo not found" });
    await GalleryAlbum.findByIdAndUpdate(photo.albumId, { $inc: { photoCount: -1 } });
    res.json({ success: true, message: "Photo deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ─────────────────────────────────────────────────────
   PATCH /api/admin/gallery/albums/:id/set-cover/:photoId
───────────────────────────────────────────────────────── */
exports.setCover = async (req, res) => {
  try {
    const photo = await GalleryPhoto.findOne({ _id: req.params.photoId, albumId: req.params.id });
    if (!photo) return res.status(404).json({ success: false, message: "Photo not found in album" });

    await GalleryAlbum.findByIdAndUpdate(req.params.id, {
      coverImage: { url: photo.url, publicId: photo.publicId },
    });
    res.json({ success: true, message: "Cover updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};