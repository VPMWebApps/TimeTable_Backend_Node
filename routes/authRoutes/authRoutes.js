const express = require("express");
const {
  registerUser,
  loginUser,
  logout,
  authMiddleware,
  checkAuth,
  getAllAlumni,
} = require("../../controllers/auth/authController");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.delete("/logout", logout);

router.get("/checkAuth", authMiddleware, checkAuth);

router.get("/test-auth",authMiddleware, (req, res) => {
  res.json({
    cookies: req.cookies,
    user: req.user || null
  });
});

router.get("/alumni",  getAllAlumni);


module.exports = router;
