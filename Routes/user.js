const exp = require("express");
const {
  login,
  logout,
  newUser,
} = require("../Controllers/user.js");
const { isAuthenticated } = require("../MiddleWares/auth.js");

const app = exp.Router();

app.post("/register", newUser);
app.post("/login", login);

// After here user must be logged in to access the routes

app.use(isAuthenticated);


app.get("/logout", logout);


module.exports = app;
