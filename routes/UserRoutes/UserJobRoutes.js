const express = require("express");
const router = express.Router();
const { createJob, getPublicJobs } = require("../../controllers/user/UserJobController");
const { authMiddleware } = require("../../controllers/auth/authController");
const { upload } = require("../../helpers/Cloudinary");
const { applyToJob, getMyApplications, getApplicationsForMyJobs } = require("../../controllers/user/ApplicationController");


router.post("/alumni/jobs/create", authMiddleware, createJob);
router.get("/alumni/jobs/get",  getPublicJobs);


//apply routes
router.post(
    "/alumni/jobs/apply",
    upload.single("resume"),
    authMiddleware,
    applyToJob
);

router.get(
    "/alumni/applications",
    authMiddleware,
    getApplicationsForMyJobs
);

router.get("/alumni/applications/alumni", authMiddleware, getMyApplications);


// GET /api/proxy-download?url=<cloudinaryUrl>&filename=<name>

router.get("/proxy-download", authMiddleware, async (req, res) => {
  const { url, filename } = req.query;
  if (!url) return res.status(400).send("Missing url");

  try {
    console.log("=== PROXY DOWNLOAD DEBUG ===");
    console.log("Incoming URL:", url);

    const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(\.[^.]+)?$/);
    console.log("Regex match:", match);

    if (!match) return res.status(400).send("Invalid Cloudinary URL");

    const publicId = match[1];
    console.log("Extracted publicId:", publicId);

    const signedUrl = cloudinary.url(publicId, {
      resource_type: "image",
      type: "upload",
      format: "pdf",
      flags: "attachment",
      expires_at: Math.floor(Date.now() / 1000) + 60,
      sign_url: true,
    });

    console.log("Generated signed URL:", signedUrl);

    const response = await fetch(signedUrl);
    console.log("Cloudinary response status:", response.status);

    if (!response.ok) return res.status(response.status).send("Fetch failed");

    res.setHeader("Content-Disposition", `attachment; filename="${filename || "resume.pdf"}"`);
    res.setHeader("Content-Type", "application/pdf");

    const { Readable } = require("stream");
    Readable.fromWeb(response.body).pipe(res);

  } catch (err) {
    console.error("proxy-download error:", err);
    res.status(500).send("Download failed");
  }
});


module.exports = router;
