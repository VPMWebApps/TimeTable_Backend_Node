const {compare} = require('bcrypt')
const { TryCatch } = require('../Utils/utility');
const {
    cookieOptions,
    sendToken
} =  require("../Utils/utility.js");
const { ErrorHandler } = require("../Utils/utility.js");
const {User} = require("../Models/user.module.js");

// Create a new user and save it to the database and save token in cookie
const newUser = TryCatch(async (req, res, next) => {
    const { name, phone, email, batch, year, password } = req.body;
  
    console.log(req);
    

    const user = await User.create({
      name,
      phone,
      email,
      batch,
      year,
      password,
    });
  
    sendToken(res, user, 201, "User created");
  });
  
  // Login user and save token in cookie
  const login = TryCatch(async (req, res, next) => {
    const { email, password } = req.body;
  
    const user = await User.findOne({ email }).select("+password");
  
    if (!user) return next(new ErrorHandler("Invalid Email or Password", 404));
  
    const isMatch = await compare(password, user.password);
  
    if (!isMatch)
      return next(new ErrorHandler("Invalid Email or Password", 404));
  
    sendToken(res, user, 200, `Welcome Back, ${user.name}`);
  });

  const logout = TryCatch(async (req, res) => {
    return res
      .status(200)
      .cookie("time-table-app-token", "", { ...cookieOptions, maxAge: 0 })
      .json({
        success: true,
        message: "Logged out successfully",
      });
  });

  module.exports = {
    newUser,
    login,
    logout,
  };