const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { User, STREAMS } = require("../../models/user.model");
const UserInfo = require("../../models/UserInfo.model");

/* ─────────────────────────────────────────
   HELPER: parse MongoDB duplicate key error
───────────────────────────────────────── */
function parseDuplicateKeyError(err) {
  if (err.code !== 11000) return null;
  const field = Object.keys(err.keyPattern)[0];
  const messages = {
    email: "An account with this email already exists.",
    phoneno: "This phone number is already registered.",
    username: "This username is already taken.",
  };
  return messages[field] || `${field} is already in use.`;
}

/* ─────────────────────────────────────────
   REGISTER
───────────────────────────────────────── */
exports.registerUser = async (req, res) => {
  try {
    const { fullname, username, batch, stream, phoneno, email, password } = req.body;

    // ── Required fields ──
    if (!fullname?.trim()) return res.status(400).json({ success: false, message: "Full name is required." });
    if (!username?.trim()) return res.status(400).json({ success: false, message: "Username is required." });
    if (!email?.trim()) return res.status(400).json({ success: false, message: "Email is required." });
    if (!password) return res.status(400).json({ success: false, message: "Password is required." });
    if (!phoneno?.trim()) return res.status(400).json({ success: false, message: "Phone number is required." });
    if (!stream) return res.status(400).json({ success: false, message: "Stream is required." });
    if (!batch) return res.status(400).json({ success: false, message: "Graduation year is required." });

    // ── Field validation ──
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters." });
    }

    if (!/^\d{10}$/.test(phoneno.trim())) {
      return res.status(400).json({ success: false, message: "Phone number must be exactly 10 digits." });
    }

    const parsedBatch = Number(batch);
    if (isNaN(parsedBatch) || parsedBatch < 1900 || parsedBatch > 2100) {
      return res.status(400).json({ success: false, message: "Invalid graduation year (1900–2100)." });
    }

    if (STREAMS && !STREAMS.includes(stream)) {
      return res.status(400).json({ success: false, message: "Invalid stream selected." });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // ── Check existing email ──
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ success: false, message: "An account with this email already exists." });
    }

    const hashPassword = await bcrypt.hash(password, 12);

    const newUser = new User({
      fullname: fullname.trim(),
      username: username.trim(),
      batch: parsedBatch,
      stream,
      phoneno: phoneno.trim(),
      email: normalizedEmail,
      password: hashPassword,
    });

    await newUser.save();

    return res.status(201).json({ success: true, message: "Registration successful!" });

  } catch (err) {
    console.error("Register error:", err);

    // Duplicate key (phone, username, or any other unique field)
    const dupMessage = parseDuplicateKeyError(err);
    if (dupMessage) {
      return res.status(409).json({ success: false, message: dupMessage });
    }

    // Mongoose validation error
    if (err.name === "ValidationError") {
      const message = Object.values(err.errors).map(e => e.message).join(" ");
      return res.status(400).json({ success: false, message });
    }

    return res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

/* ─────────────────────────────────────────
   LOGIN
───────────────────────────────────────── */
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim()) return res.status(400).json({ success: false, message: "Email is required." });
    if (!password) return res.status(400).json({ success: false, message: "Password is required." });

    const normalizedEmail = email.toLowerCase().trim();

    const checkUser = await User.findOne({ email: normalizedEmail }).select("+password");
    if (!checkUser) {
      return res.status(404).json({ success: false, message: "No account found with this email." });
    }

    const match = await bcrypt.compare(password, checkUser.password);
    if (!match) {
      return res.status(401).json({ success: false, message: "Incorrect password." });
    }

    checkUser.lastLoginAt = new Date();
    checkUser.loginCount += 1;
    await checkUser.save();

    const token = jwt.sign(
      { id: checkUser._id, role: checkUser.role },
      process.env.CLIENT_SECRET_KEY,
      { expiresIn: "1d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    }).json({
      success: true,
      message: "Logged in successfully!",
      user: {
        id: checkUser._id,
        email: checkUser.email,
        role: checkUser.role,
        username: checkUser.username,
      },
    });

  } catch (err) {
    console.error("Login error:", err);

    if (err.name === "JsonWebTokenError") {
      return res.status(500).json({ success: false, message: "Token generation failed. Please try again." });
    }

    return res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

/* ─────────────────────────────────────────
   GET ALL ALUMNI
───────────────────────────────────────── */
exports.getAllAlumni = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    if (page < 1 || limit < 1 || limit > 100) {
      return res.status(400).json({ success: false, message: "Invalid pagination parameters." });
    }

    const skip = (page - 1) * limit;
    const filter = { role: "user" };
    const { search, loggedIn, batch, stream } = req.query;

    if (loggedIn === "true") filter.loginCount = { $gt: 0 };

    if (batch) {
      const parsedBatch = Number(batch);
      if (isNaN(parsedBatch) || parsedBatch < 1900 || parsedBatch > 2100) {
        return res.status(400).json({ success: false, message: "Invalid batch year." });
      }
      filter.batch = parsedBatch;
    }

    if (stream) {
      if (STREAMS && !STREAMS.includes(stream)) {
        return res.status(400).json({ success: false, message: "Invalid stream." });
      }
      filter.stream = stream;
    }

    if (search?.trim()) filter.$text = { $search: search.trim() };

    const query = User.find(filter)
      .select("fullname username batch stream email phoneno lastLoginAt loginCount createdAt")
      .skip(skip)
      .limit(limit);

    if (filter.$text) {
      query.select({ score: { $meta: "textScore" } }).sort({ score: { $meta: "textScore" } });
    } else {
      query.sort({ createdAt: -1 });
    }

    const [users, total] = await Promise.all([query, User.countDocuments(filter)]);

    const userIds = users.map((u) => u._id);
    const profiles = await UserInfo.find({ user: { $in: userIds } })
      .select("user linkedin jobTitle profilePicture company");

    const profileMap = {};
    for (const profile of profiles) {
      profileMap[profile.user.toString()] = profile;
    }

    const enrichedUsers = users.map((user) => {
      const profile = profileMap[user._id.toString()];
      return {
        ...user.toObject(),
        jobTitle: profile?.jobTitle ?? "",
        linkedin: profile?.linkedin ?? "",
        profilePicture: profile?.profilePicture ?? "",
        company: profile?.company ?? "",
      };
    });

    return res.status(200).json({
      success: true,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalUsers: total,
      data: enrichedUsers,
    });

  } catch (err) {
    console.error("getAllAlumni error:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch alumni. Please try again." });
  }
};

/* ─────────────────────────────────────────
   LOGOUT
───────────────────────────────────────── */
exports.logout = (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    }).json({ success: true, message: "Logged out successfully!" });
  } catch (err) {
    console.error("Logout error:", err);
    return res.status(500).json({ success: false, message: "Logout failed. Please try again." });
  }
};

/* ─────────────────────────────────────────
   AUTH MIDDLEWARE
───────────────────────────────────────── */
exports.authMiddleware = async (req, res, next) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ success: false, message: "Unauthorized access." });
    }

    const decoded = jwt.verify(token, process.env.CLIENT_SECRET_KEY);

    const user = await User.findById(decoded.id)
      .select("_id fullname username email stream batch role");

    if (!user) {
      return res.status(401).json({ success: false, message: "User not found. Please log in again." });
    }

    req.user = user;
    next();

  } catch (err) {
    console.error("Auth middleware error:", err);

    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, message: "Session expired. Please log in again." });
    }
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ success: false, message: "Invalid session. Please log in again." });
    }

    return res.status(401).json({ success: false, message: "Unauthorized access." });
  }
};

/* ─────────────────────────────────────────
   CHECK AUTH
───────────────────────────────────────── */
exports.checkAuth = (req, res) => {
  try {
    const user = req.user;
    res.status(200).json({
      success: true,
      message: "User authenticated!",
      user: {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        username: user.username,
        fullname: user.fullname,
        stream: user.stream,
        batch: user.batch,
      },
    });
  } catch (err) {
    console.error("checkAuth error:", err);
    return res.status(500).json({ success: false, message: "Authentication check failed." });
  }
};