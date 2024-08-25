const jwt = require("jsonwebtoken");
const { APP_TOKEN } = require("../Config/config.js");

class ErrorHandler extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

const TryCatch = (passedFunc) => async (req, res, next) => {
  try {
    await passedFunc(req, res, next);
  } catch (error) {
    // res.status(error.statusCode).json(error.message);
    next(error);
  }
};

const cookieOptions = {
  maxAge: 15 * 24 * 60 * 60 * 1000,
  sameSite: "none",
  httpOnly: true,
  secure: true,
};

const sendToken = (res, user, code, message) => {
  const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);

  return res.status(code).cookie(APP_TOKEN, token, cookieOptions).json({
    success: true,
    user,
    message,
  });
};


module.exports = {
  ErrorHandler,
  TryCatch,
  cookieOptions,
  sendToken
};
