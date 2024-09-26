const jwt = require("jsonwebtoken");
const { ErrorHandler, TryCatch } = require("../Utils/utility.js");

const isAuthenticated = TryCatch((req, res, next) => {
    const token = req.cookies["time-table-app-token"];
    // console.log(token);
    if (!token)
      return next(new ErrorHandler("Please login to access this route", 401));
  
    const decodedData = jwt.verify(token, process.env.JWT_SECRET);
  
    req.user = decodedData._id;
  
    next();
  });

  module.exports = { isAuthenticated };