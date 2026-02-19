const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { User, STREAMS } = require("../../models/user.model");
const UserInfo = require("../../models/UserInfo.model");

exports.registerUser = async (req, res) => {
  const { fullname, username, batch, stream, phoneno, email, password } =
    req.body;

  try {
    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists",
      });
    }

    const hashPassword = await bcrypt.hash(password, 12);

    const parsedBatch = Number(batch);

    if (isNaN(parsedBatch) || parsedBatch < 1900 || parsedBatch > 2100) {
      return res.status(400).json({
        success: false,
        message: "Invalid graduation year",
      });
    }


    const newUser = new User({
      fullname,
      username,
      batch: parsedBatch,
      stream,               // must match enum exactly
      phoneno,
      email: normalizedEmail,
      password: hashPassword,
    });

    await newUser.save();

    res.status(201).json({
      success: true,
      message: "Registration Successful",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const normalizedEmail = email.toLowerCase().trim();

    const checkUser = await User.findOne({ email: normalizedEmail }).select(
      "+password"
    );

    if (!checkUser) {
      return res.status(404).json({
        success: false,
        message: "User doesn't exist",
      });
    }

    const match = await bcrypt.compare(password, checkUser.password);

    if (!match) {
      return res.status(401).json({
        success: false,
        message: "Incorrect password",
      });
    }

    // ✅ Track login
    checkUser.lastLoginAt = new Date();
    checkUser.loginCount += 1;
    await checkUser.save();

    const token = jwt.sign(
      {
        id: checkUser._id,
        role: checkUser.role,
      },
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
      message: "Logged in successfully",
      user: {
        id: checkUser._id,
        email: checkUser.email,
        role: checkUser.role,
        username: checkUser.username,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.getAllAlumni = async (req, res) => {
  try {
    /* =========================
       VALIDATE PAGINATION
    ========================= */

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    if (page < 1 || limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        message: "Invalid pagination parameters",
      });
    }

    const skip = (page - 1) * limit;

    /* =========================
       BUILD FILTER
    ========================= */

    const filter = { role: "user" };

    const { search, loggedIn, batch, stream } = req.query;

    // Only logged-in users
    if (loggedIn === "true") {
      filter.loginCount = { $gt: 0 };
    }

    // Batch validation
    if (batch) {
      const parsedBatch = Number(batch);

      if (
        isNaN(parsedBatch) ||
        parsedBatch < 1900 ||
        parsedBatch > 2100
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid batch year",
        });
      }

      filter.batch = parsedBatch;
    }

    // Stream validation
    if (stream) {
      if (!STREAMS.includes(stream)) {
        return res.status(400).json({
          success: false,
          message: "Invalid stream",
        });
      }

      filter.stream = stream;
    }

    // Text search
    if (search?.trim()) {
      filter.$text = { $search: search.trim() };
    }

    /* =========================
       QUERY USERS
    ========================= */

    const query = User.find(filter)
      .select(
        "fullname username batch stream email phoneno lastLoginAt loginCount createdAt"
      )
      .skip(skip)
      .limit(limit);

    // Sort logic
    if (filter.$text) {
      query
        .select({ score: { $meta: "textScore" } })
        .sort({ score: { $meta: "textScore" } });
    } else {
      query.sort({ createdAt: -1 });
    }

    const users = await query;

    const total = await User.countDocuments(filter);

    /* =========================
       FETCH PROFILES
    ========================= */

    const userIds = users.map((u) => u._id);

    const profiles = await UserInfo.find({
      user: { $in: userIds },
    }).select("user linkedin jobTitle profilePicture company");

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

    /* =========================
       RESPONSE
    ========================= */

    return res.status(200).json({
      success: true,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalUsers: total,
      data: enrichedUsers,
    });
  } catch (error) {
    console.error("getAllAlumni error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch alumni",
    });
  }
};

// LOGOUT
exports.logout = (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
  }).json({
    success: true,
    message: "Logout successfully!",
  });
};;

// AUTH MIDDLEWARE
exports.authMiddleware = async (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized access",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.CLIENT_SECRET_KEY);

    const user = await User.findById(decoded.id).select("_id fullname username email stream batch role");


    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    req.user = user; // 🔥 FULL USER OBJECT
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized access",
    });
  }
};

// CHECK AUTH
exports.checkAuth = (req, res) => {
  const user = req.user;
  res.status(200).json({
    success: true,
    message: "User authenticated!",
    user: {
      id: user._id.toString(), // ← add this, matches login response
      email: user.email,
      role: user.role,
      username: user.username,
      fullname: user.fullname,
      stream: user.stream,
      batch: user.batch,
    },
  });
};

