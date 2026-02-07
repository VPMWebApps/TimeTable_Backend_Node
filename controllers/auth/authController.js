const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../../models/user.model");

// REGISTER
exports.registerUser = async (req, res) => {
  const { fullname, username, batch, stream, phoneno, email, password } =
    req.body;

  try {
    const checkUser = await User.findOne({ email });

    if (checkUser) {
      return res.json({ success: false, message: "User already exists" });
    }

    const hashPassword = await bcrypt.hash(password, 12);

    const newUser = new User({
      username,
      fullname,
      batch,
      stream,
      phoneno,
      email,
      password: hashPassword,
    });

    await newUser.save();

    res.status(200).json({
      success: true,
      message: "Registration Successful!!!",
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: "Some error occurred",
    });
  }
};

// LOGIN
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const checkUser = await User.findOne({ email });
    if (!checkUser)
      return res.json({
        success: false,
        message: "User doesn't exist! Please register first",
      });

    const checkPasswordMatch = await bcrypt.compare(
      password,
      checkUser.password
    );
    if (!checkPasswordMatch)
      return res.json({
        success: false,
        message: "Incorrect password! Please try again",
      });

    const token = jwt.sign(
      {
        id: checkUser._id,
        role: checkUser.role,
        email: checkUser.email,
        username: checkUser.username,
      },
      process.env.CLIENT_SECRET_KEY, // use env variable
      { expiresIn: "1d" }
    );

    // const isProduction = process.env.NODE_ENV === "production";

    res.cookie("token", token, {
      httpOnly: true,
      secure: false,        // ✅ false locally, true on HTTPS
      // sameSite: isProduction ? "none" : "lax",
      sameSite:"lax",
      maxAge: 24 * 60 * 60 * 1000,
    })
      .json({
        success: true,
        message: "Logged in successfully",
        user: {
          email: checkUser.email,
          role: checkUser.role,
          id: checkUser._id,
          username: checkUser.username,
        },
      });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: "Some error occurred",
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
    user,
  });
};
