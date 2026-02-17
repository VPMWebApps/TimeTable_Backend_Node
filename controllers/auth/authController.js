const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../../models/user.model");
const UserInfo = require("../../models/UserInfo.model");


exports.registerUser = async (req, res) => {
  const { fullname, username, batch, stream, phoneno, email, password } =
    req.body;

  try {
    const normalizedEmail = email.toLowerCase().trim();

    const checkUser = await User.findOne({ email: normalizedEmail });
    if (checkUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists",
      });
    }
    
    const academic = await Academic.findById(req.body.academic);

    if (!academic || !academic.isActive) {
      return res.status(400).json({
        success: false,
        message: "Invalid academic selection",
      });
    }

    const hashPassword = await bcrypt.hash(password, 12);

    const newUser = new User({
      fullname,
      username,
      academic: "academicObjectId",
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
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const search = req.query.search?.trim() || "";
    const onlyLoggedIn = req.query.loggedIn === "true";
    const batch = req.query.batch?.trim();
    const stream = req.query.stream?.trim();
    const skip = (page - 1) * limit;

    /* =========================
       BUILD FILTER OBJECT
    ========================= */
    const filter = { role: "user" };

    if (onlyLoggedIn) {
      filter.loginCount = { $gt: 0 };
    }

    // Batch filter (strict 4 digit match)
    if (batch) {
      if (!/^[0-9]{4}$/.test(batch)) {
        return res.status(400).json({
          success: false,
          message: "Invalid batch format",
        });
      }
      filter.batch = batch;
    }

    // Stream filter (case-insensitive exact match)
    if (stream) {
      filter.stream = { $regex: `^${stream}$`, $options: "i" };
    }

    // Text search (must be last to avoid accidental override)
    if (search) {
      filter.$text = { $search: search };
    }

    /* =========================
       FETCH USERS
    ========================= */
    const users = await User.find(filter)
      .select(
        "fullname username batch stream email phoneno lastLoginAt loginCount createdAt"
      )
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(filter);

    /* =========================
       FETCH PROFILES
    ========================= */
    const userIds = users.map((u) => u._id);
    const profiles = await UserInfo.find({
      user: { $in: userIds },
    }).select("user linkedin jobTitle profilePicture company");

    const profileMap = {};
    profiles.forEach((profile) => {
      profileMap[profile.user.toString()] = profile;
    });

    const enrichedUsers = users.map((user) => {
      const profile = profileMap[user._id.toString()];
      return {
        ...user.toObject(),
        jobTitle: profile?.jobTitle || "",
        linkedin: profile?.linkedin || "",
        profilePicture: profile?.profilePicture || "",
        company: profile?.company || "",
      };
    });

    /* =========================
       RESPONSE
    ========================= */
    res.status(200).json({
      success: true,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalUsers: total,
      data: enrichedUsers,
    });
  } catch (error) {
    console.error("getAllAlumni error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch alumni",
    });
  }
};

// exports.getAllAlumni = async (req, res) => {
//   try {
//     const page = Math.max(parseInt(req.query.page) || 1, 1);
//     const limit = Math.min(parseInt(req.query.limit) || 20, 100);

//     const search = req.query.search?.trim() || "";
//     const onlyLoggedIn = req.query.loggedIn === "true";

//     const batch = req.query.batch?.trim();
//     const stream = req.query.stream?.trim();

//     const skip = (page - 1) * limit;

//     /* =========================
//        BUILD FILTER OBJECT
//     ========================= */
//     const filter = { role: "user" };

//     if (onlyLoggedIn) {
//       filter.loginCount = { $gt: 0 };
//     }

//     // Batch filter (strict 4 digit match)
//     if (batch) {
//       if (!/^[0-9]{4}$/.test(batch)) {
//         return res.status(400).json({
//           success: false,
//           message: "Invalid batch format",
//         });
//       }
//       filter.batch = batch;
//     }

//     // Stream filter (case-insensitive exact match)
//     if (stream) {
//       filter.stream = { $regex: `^${stream}$`, $options: "i" };
//     }

//     // Text search (must be last to avoid accidental override)
//     if (search) {
//       filter.$text = { $search: search };
//     }

//     /* =========================
//        FETCH USERS
//     ========================= */
//     const users = await User.find(filter)
//       .select(
//         "fullname username batch stream email phoneno lastLoginAt loginCount createdAt"
//       )
//       .skip(skip)
//       .limit(limit)
//       .sort({ createdAt: -1 });

//     const total = await User.countDocuments(filter);

//     /* =========================
//        FETCH PROFILES
//     ========================= */
//     const userIds = users.map((u) => u._id);

//     const profiles = await UserInfo.find({
//       user: { $in: userIds },
//     }).select("user linkedin jobTitle profilePicture company");

//     const profileMap = {};
//     profiles.forEach((profile) => {
//       profileMap[profile.user.toString()] = profile;
//     });

//     const enrichedUsers = users.map((user) => {
//       const profile = profileMap[user._id.toString()];
//       return {
//         ...user.toObject(),
//         jobTitle: profile?.jobTitle || "",
//         linkedin: profile?.linkedin || "",
//         profilePicture: profile?.profilePicture || "",
//         company: profile?.company || "",
//       };
//     });

//     /* =========================
//        RESPONSE
//     ========================= */
//     res.status(200).json({
//       success: true,
//       currentPage: page,
//       totalPages: Math.ceil(total / limit),
//       totalUsers: total,
//       data: enrichedUsers,
//     });

//   } catch (error) {
//     console.error("getAllAlumni error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to fetch alumni",
//     });
//   }
// };

// exports.getAllAlumni = async (req, res) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 20;
//     const search = req.query.search || "";
//     const onlyLoggedIn = req.query.loggedIn === "true";

//     const skip = (page - 1) * limit;

//     const filter = { role: "user" };

//     // Optional: only users who logged in at least once
//     if (onlyLoggedIn) {
//       filter.loginCount = { $gt: 0 };
//     }

//     if (search) {
//       filter.$text = { $search: search };
//     }

//     const users = await User.find(filter)
//       .select(
//         "fullname username batch stream email phoneno lastLoginAt loginCount createdAt"
//       )
//       .skip(skip)
//       .limit(limit)
//       .sort({ createdAt: -1 });

//     const total = await User.countDocuments(filter);

//     res.status(200).json({
//       success: true,
//       currentPage: page,
//       totalPages: Math.ceil(total / limit),
//       totalUsers: total,
//       data: users,
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to fetch alumni",
//     });
//   }
// };

// REGISTER
// exports.registerUser = async (req, res) => {
//   const { fullname, username, batch, stream, phoneno, email, password } =
//     req.body;

//   try {
//     const checkUser = await User.findOne({ email });

//     if (checkUser) {
//       return res.json({ success: false, message: "User already exists" });
//     }

//     const hashPassword = await bcrypt.hash(password, 12);

//     const newUser = new User({
//       username,
//       fullname,
//       batch,
//       stream,
//       phoneno,
//       email,
//       password: hashPassword,
//     });

//     await newUser.save();

//     res.status(200).json({
//       success: true,
//       message: "Registration Successful!!!",
//     });
//   } catch (err) {
//     console.log(err);
//     res.status(500).json({
//       success: false,
//       message: "Some error occurred",
//     });
//   }
// };

// LOGIN
// exports.loginUser = async (req, res) => {
//   const { email, password } = req.body;

//   try {
//     const checkUser = await User.findOne({ email });
//     if (!checkUser)
//       return res.json({
//         success: false,
//         message: "User doesn't exist! Please register first",
//       });

//     const checkPasswordMatch = await bcrypt.compare(
//       password,
//       checkUser.password
//     );
//     if (!checkPasswordMatch)
//       return res.json({
//         success: false,
//         message: "Incorrect password! Please try again",
//       });

//     const token = jwt.sign(
//       {
//         id: checkUser._id,
//         role: checkUser.role,
//         email: checkUser.email,
//         username: checkUser.username,
//       },
//       process.env.CLIENT_SECRET_KEY, // use env variable
//       { expiresIn: "1d" }
//     );

//     // const isProduction = process.env.NODE_ENV === "production";

//     res.cookie("token", token, {
//       httpOnly: true,
//       secure: false,        // ✅ false locally, true on HTTPS
//       // sameSite: isProduction ? "none" : "lax",
//       sameSite:"lax",
//       maxAge: 24 * 60 * 60 * 1000,
//     })
//       .json({
//         success: true,
//         message: "Logged in successfully",
//         user: {
//           email: checkUser.email,
//           role: checkUser.role,
//           id: checkUser._id,
//           username: checkUser.username,
//         },
//       });
//   } catch (err) {
//     console.log(err);
//     res.status(500).json({
//       success: false,
//       message: "Some error occurred",
//     });
//   }
// };

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
    user,
  });
};


