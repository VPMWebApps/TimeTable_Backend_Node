const News = require("../../models/News.model");

/* ─────────────────────────────────────────────────────────────
   GET /api/user/news
   Public news feed — published only, with pagination + filters
───────────────────────────────────────────────────────────── */
exports.getPublicNews = async (req, res) => {
  try {
    const page  = Math.max(Number(req.query.page)  || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 9, 30);
    const skip  = (page - 1) * limit;

    const query = { isPublished: true };

    if (req.query.category) query.category = req.query.category;

    if (req.query.search) {
      query.$or = [
        { title:   new RegExp(req.query.search, "i") },
        { excerpt: new RegExp(req.query.search, "i") },
        { tags:    new RegExp(req.query.search, "i") },
      ];
    }

    const [news, total] = await Promise.all([
      News.find(query)
        .sort({ publishedAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("title excerpt category coverImage publishedAt tags viewCount")
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

/* ─────────────────────────────────────────────────────────────
   GET /api/user/news/:id
   Single article — increments view count
───────────────────────────────────────────────────────────── */
exports.getPublicNewsById = async (req, res) => {
  try {
    const news = await News.findOneAndUpdate(
      { _id: req.params.id, isPublished: true },
      { $inc: { viewCount: 1 } },
      { new: true }
    )
      .select("title content excerpt category coverImage publishedAt tags viewCount postedBy")
      .lean();

    if (!news) return res.status(404).json({ success: false, message: "Article not found" });

    res.json({ success: true, data: news });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Failed to fetch article" });
  }
};

/* ─────────────────────────────────────────────────────────────
   GET /api/user/news/latest
   Latest 4 published articles — for homepage widgets
───────────────────────────────────────────────────────────── */
exports.getLatestNews = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 4, 10);
    const news = await News.find({ isPublished: true })
      .sort({ publishedAt: -1 })
      .limit(limit)
      .select("title excerpt category coverImage publishedAt tags")
      .lean();

    res.json({ success: true, data: news });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Failed to fetch news" });
  }
};