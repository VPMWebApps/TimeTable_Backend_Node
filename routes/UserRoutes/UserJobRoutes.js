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
// GET /api/proxy-download?url=<cloudinaryUrl>&filename=<name>
router.get("/proxy-download", async (req, res) => {
  const { url, filename } = req.query;
  if (!url) return res.status(400).send("Missing url");

  try {
    const response = await fetch(url);
    if (!response.ok) return res.status(response.status).send("Fetch failed");

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename || "resume.pdf"}"`
    );
    res.setHeader(
      "Content-Type",
      response.headers.get("content-type") || "application/pdf"
    );

    // Node fetch returns a Web ReadableStream — convert to Node stream
    const { Readable } = require("stream");
    Readable.fromWeb(response.body).pipe(res);
  } catch (err) {
    console.error("proxy-download error:", err);
    res.status(500).send("Download failed");
  }
});


module.exports = router;
