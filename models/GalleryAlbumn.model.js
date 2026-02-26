const mongoose = require("mongoose");

const GalleryAlbumSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 120,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    coverImage: {
      url:      { type: String, default: null },
      publicId: { type: String, default: null },
    },

    /* Date the event/photos were taken (not createdAt) */
    eventDate: {
      type: Date,
      default: null,
    },

    /* "pending" → admin review → "approved" | "rejected"
       Admin uploads skip straight to "approved"              */
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },

    rejectionReason: {
      type: String,
      default: "",
    },

    /* Who created this album */
    uploadedBy: {
      userId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      name:     { type: String, required: true },
      role:     { type: String, enum: ["user", "admin"], default: "user" },
    },

    /* If admin merged N albums into this one, track source IDs */
    mergedFrom: [{ type: mongoose.Schema.Types.ObjectId, ref: "GalleryAlbum" }],

    /* Denormalised photo count — updated on photo add/delete */
    photoCount: { type: Number, default: 0 },

    /* Tags for searchability */
    tags: [{ type: String, trim: true }],
  },
  { timestamps: true, versionKey: false }
);

GalleryAlbumSchema.index({ status: 1, createdAt: -1 });
GalleryAlbumSchema.index({ "uploadedBy.userId": 1, status: 1 });

module.exports = mongoose.model("GalleryAlbum", GalleryAlbumSchema);