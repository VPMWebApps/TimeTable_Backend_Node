const { cloudinary } = require("../../helpers/Cloudinary");

const https = require("https");

exports.proxyFile = async (req, res) => {
  try {
    const { url, filename, download } = req.query; // ← add download param

    if (!url) return res.status(400).json({ success: false, message: "Missing url" });

    const decoded = decodeURIComponent(url);
    if (!decoded.startsWith("https://res.cloudinary.com/")) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    res.setHeader("Content-Type", "application/pdf");
    
    // Only force download when explicitly requested
    if (download === "true") {
      res.setHeader("Content-Disposition", `attachment; filename="${filename || "resume.pdf"}"`);
    }
    
    res.setHeader("Cache-Control", "private, max-age=300");

    const https = require("https");
    https.get(decoded, (cloudinaryRes) => {
      if (cloudinaryRes.statusCode !== 200) {
        return res.status(502).json({ message: `Cloudinary returned ${cloudinaryRes.statusCode}` });
      }
      cloudinaryRes.pipe(res);
    }).on("error", (err) => {
      res.status(500).json({ message: "Stream failed" });
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};