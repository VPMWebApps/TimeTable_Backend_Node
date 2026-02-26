const mongoose = require("mongoose");

const GalleryPhotoSchema = new mongoose.Schema(
  {
    albumId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GalleryAlbum",
      required: true,
      index: true,
    },

    url:      { type: String, required: true },
    publicId: { type: String, required: true },

    caption: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },

    uploadedBy: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      name:   { type: String, required: true },
    },

    /* Width & height stored for masonry/layout hints */
    width:  { type: Number, default: null },
    height: { type: Number, default: null },
  },
  { timestamps: true, versionKey: false }
);

GalleryPhotoSchema.index({ albumId: 1, createdAt: 1 });

module.exports = mongoose.model("GalleryPhoto", GalleryPhotoSchema);