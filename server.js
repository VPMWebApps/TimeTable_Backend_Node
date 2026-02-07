const mongoose = require("mongoose");
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const dotenv = require("dotenv");
const authRoutes = require("./routes/authRoutes/authRoutes");
const AdminEventRoutes = require("./routes/adminRoutes/AdminEventRoutes");
const AdminJobRoutes = require("./routes/adminRoutes/AdminJobRoutes");
const UserEventRoutes = require("./routes/UserRoutes/UserEventRoutes");
const UserJobRoutes = require("./routes/UserRoutes/UserJobRoutes");
dotenv.config();

const app = express();

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST", "DELETE", "PUT","PATCH"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Cache-Control",
      "Expires",
      "Pragma",
    ],
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());


//auth
app.use("/api/auth", authRoutes);

//admin
app.use("/api/admin/events", AdminEventRoutes);
app.use("/api/admin/jobs", AdminJobRoutes);

//user
app.use("/api/user/events", UserEventRoutes);
app.use("/api/user/jobs",UserJobRoutes)


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
