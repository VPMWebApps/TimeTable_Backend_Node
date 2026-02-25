const mongoose = require("mongoose");

const NewsSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 150,
    },

    content: {
      type: String,
      required: true,
      trim: true,
      minlength: 20,
    },

    excerpt: {
      type: String,
      trim: true,
      maxlength: 300,
    },

    coverImage: {
      url: { type: String, default: null },
      publicId: { type: String, default: null },
    },

    category: {
      type: String,
      enum: ["announcement", "achievement", "event", "general", "alumni-spotlight"],
      default: "general",
      index: true,
    },

    tags: [{ type: String, trim: true }],

    isPublished: {
      type: Boolean,
      default: false,
      index: true,
    },

    publishedAt: {
      type: Date,
      default: null,
    },

    postedBy: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      name: { type: String, required: true },
    },

    viewCount: {
      type: Number,
      default: 0,
    },

    newsType: {
      type: String,
      enum: ["main", "regular"],
      default: "regular",
      index: true,
    },
  },
  { timestamps: true, versionKey: false }
);

/* ── Auto-set publishedAt when isPublished flips to true ── */
NewsSchema.pre("save", function (next) {
  if (this.isModified("isPublished") && this.isPublished && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  // Auto-generate excerpt from content if not provided
  if (!this.excerpt && this.content) {
    this.excerpt = this.content.replace(/[#*_`>]/g, "").substring(0, 250).trim() + "...";
  }
  next();
});

NewsSchema.index({ isPublished: 1, publishedAt: -1 });
NewsSchema.index({ newsType: 1, isPublished: 1 });
NewsSchema.index({ category: 1, isPublished: 1 });
NewsSchema.index({ title: "text", content: "text" });

module.exports = mongoose.model("News", NewsSchema);