const News = require("../../models/News.model");
const { handleImageUploadUtil } = require("../../helpers/Cloudinary");

/* ─────────────────────────────────────────
   POST /api/admin/news
   Admin creates a news article
───────────────────────────────────────── */
exports.createNews = async (req, res) => {
  try {
    const { title, content, excerpt, category, tags, isPublished, newsType } = req.body; // 👈 add newsType

    if (!title?.trim() || !content?.trim()) {
      return res.status(400).json({ success: false, message: "Title and content are required" });
    }

    let coverImage = { url: null, publicId: null };

    if (req.file) {
      const result = await handleImageUploadUtil(req.file.buffer, req.file.mimetype);
      coverImage = { url: result.secure_url, publicId: result.public_id };
    }

    const publish = isPublished === "true" || isPublished === true;

    const news = await News.create({
      title: title.trim(),
      content: content.trim(),
      excerpt: excerpt?.trim() || "",
      coverImage,
      category: category || "general",
      tags: tags ? (Array.isArray(tags) ? tags : JSON.parse(tags)) : [],
      newsType: newsType || "regular",
      isPublished: publish,
      publishedAt: publish ? new Date() : null,
      postedBy: {
        userId: req.user._id,
        name: req.user.fullname || req.user.username || "Admin",
      },
    });

    // Add this BEFORE res.json() in both create and update:
    if (news.newsType === "main") {
      await News.updateMany(
        { newsType: "main", _id: { $ne: news._id } },
        { $set: { newsType: "regular" } }
      );
    }


    res.status(201).json({ success: true, message: "News created successfully", data: news });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Failed to create news" });
  }
};

/* ─────────────────────────────────────────
   GET /api/admin/news?page=1&limit=10&category=&search=&isPublished=
   Admin lists all news (drafts + published)
───────────────────────────────────────── */
exports.getAllNewsAdmin = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 10, 50);
    const skip = (page - 1) * limit;

    const query = {};

    if (req.query.category) query.category = req.query.category;
    if (req.query.isPublished !== undefined && req.query.isPublished !== "") {
      query.isPublished = req.query.isPublished === "true";
    }
    if (req.query.search) {
      query.$or = [
        { title: new RegExp(req.query.search, "i") },
        { content: new RegExp(req.query.search, "i") },
      ];
    }

    const [news, total] = await Promise.all([
      News.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("title excerpt category isPublished publishedAt coverImage createdAt viewCount tags")
        .lean(),
      News.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: news,
      pagination: { total, page, pages: Math.ceil(total / limit), limit },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Failed to fetch news" });
  }
};

/* ─────────────────────────────────────────
   GET /api/admin/news/:id
   Admin gets single news (full content)
───────────────────────────────────────── */
exports.getNewsById = async (req, res) => {
  try {
    const news = await News.findById(req.params.id).lean();
    if (!news) return res.status(404).json({ success: false, message: "News not found" });
    res.json({ success: true, data: news });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Failed to fetch news" });
  }
};

/* ─────────────────────────────────────────
   PATCH /api/admin/news/:id
   Admin updates a news article
───────────────────────────────────────── */
exports.updateNews = async (req, res) => {
  try {
    const news = await News.findById(req.params.id);
    if (!news) return res.status(404).json({ success: false, message: "News not found" });

    const { title, content, excerpt, category, tags, isPublished,newsType  } = req.body;

    if (title !== undefined) news.title = title.trim();
    if (content !== undefined) news.content = content.trim();
    if (excerpt !== undefined) news.excerpt = excerpt.trim();
    if (category !== undefined) news.category = category;
    if (newsType !== undefined) news.newsType = newsType;
    if (tags !== undefined) news.tags = Array.isArray(tags) ? tags : JSON.parse(tags);

    if (isPublished !== undefined) {
      const publish = isPublished === "true" || isPublished === true;
      if (publish && !news.isPublished) news.publishedAt = new Date();
      news.isPublished = publish;
    }

    // Add this BEFORE res.json() in both create and update:
    if (news.newsType === "main") {
      await News.updateMany(
        { newsType: "main", _id: { $ne: news._id } },
        { $set: { newsType: "regular" } }
      );
    }

    // Replace cover image if new file uploaded
    if (req.file) {
      const result = await handleImageUploadUtil(req.file.buffer, req.file.mimetype);
      news.coverImage = { url: result.secure_url, publicId: result.public_id };
    }

    await news.save();
    res.json({ success: true, message: "News updated successfully", data: news });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Failed to update news" });
  }
};

/* ─────────────────────────────────────────
   PATCH /api/admin/news/:id/toggle-publish
   Quick publish/unpublish toggle
───────────────────────────────────────── */
exports.togglePublish = async (req, res) => {
  try {
    const news = await News.findById(req.params.id);
    if (!news) return res.status(404).json({ success: false, message: "News not found" });

    news.isPublished = !news.isPublished;
    if (news.isPublished && !news.publishedAt) news.publishedAt = new Date();

    await news.save();
    res.json({
      success: true,
      message: `News ${news.isPublished ? "published" : "unpublished"} successfully`,
      data: { isPublished: news.isPublished, publishedAt: news.publishedAt },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Failed to toggle publish" });
  }
};

/* ─────────────────────────────────────────
   DELETE /api/admin/news/:id
───────────────────────────────────────── */
exports.deleteNews = async (req, res) => {
  try {
    const news = await News.findByIdAndDelete(req.params.id);
    if (!news) return res.status(404).json({ success: false, message: "News not found" });
    res.json({ success: true, message: "News deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Failed to delete news" });
  }
};