// controllers/admin/ProxyController.js
const { cloudinary } = require("../../helpers/Cloudinary"); // reuse your existing configured instance

exports.proxyFile = async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ success: false, message: "Missing url param" });
    }

    const decoded = decodeURIComponent(url);

    if (!decoded.startsWith("https://res.cloudinary.com/")) {
      return res.status(403).json({ success: false, message: "Forbidden origin" });
    }

    // Extract public_id — works for both /raw/upload/ and /image/upload/
    const match = decoded.match(/\/(?:raw|image|video)\/upload\/(?:v\d+\/)?(.+)$/);
    if (!match) {
      return res.status(400).json({ success: false, message: "Could not parse Cloudinary URL" });
    }

    // Strip file extension from public_id for Cloudinary SDK
    // e.g. "resumes/1772340333492_testresume.pdf.pdf" → "resumes/1772340333492_testresume.pdf"
    let publicId = match[1];
    // Remove trailing duplicate extension if present (e.g. .pdf.pdf)
    publicId = publicId.replace(/\.pdf\.pdf$/i, ".pdf");
    console.log("PROXY public_id:", publicId);

    // Determine resource_type from URL
    const resourceType = decoded.includes("/raw/upload/") ? "raw" : "image";

    // ✅ Use Cloudinary's download_url helper — signs the URL with your API credentials
    // This works regardless of access control settings
    const signedUrl = cloudinary.utils.private_download_url(publicId, "pdf", {
      resource_type: resourceType,
      attachment: false,
    });

    console.log("PROXY signed URL:", signedUrl);

    // Stream it back to the client
    const https = require("https");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline");
    res.setHeader("Cache-Control", "private, max-age=300");

    https.get(signedUrl, (cloudinaryRes) => {
      if (cloudinaryRes.statusCode !== 200) {
        console.error("Cloudinary stream status:", cloudinaryRes.statusCode);
        res.status(cloudinaryRes.statusCode).json({
          success: false,
          message: `Cloudinary returned ${cloudinaryRes.statusCode}`,
        });
        return;
      }
      cloudinaryRes.pipe(res);
    }).on("error", (err) => {
      console.error("PROXY stream error:", err.message);
      res.status(500).json({ success: false, message: "Stream failed" });
    });

  } catch (err) {
    console.error("PROXY ERROR:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};