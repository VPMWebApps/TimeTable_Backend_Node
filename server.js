const mongoose = require("mongoose");
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const dotenv = require("dotenv");

const http = require("http");
const { Server } = require("socket.io");

const authRoutes = require("./routes/authRoutes/authRoutes");
const AdminEventRoutes = require("./routes/adminRoutes/AdminEventRoutes");
const AdminJobRoutes = require("./routes/adminRoutes/AdminJobRoutes");
const UserEventRoutes = require("./routes/UserRoutes/UserEventRoutes");
const UserJobRoutes = require("./routes/UserRoutes/UserJobRoutes");
const UserInfoRoutes = require("./routes/UserRoutes/UserInfoRoutes");
const ConnectionRoutes = require("./routes/UserRoutes/ConnectionRoutes")
const messageRoutes = require("./routes/UserRoutes/MessageRoutes");
const NewsRoutes = require("./routes/adminRoutes/AdminNewsRouts")
const UserNewRoutes = require("./routes/UserRoutes/UserNewsRoutes")
const AdminGalleryRoutes = require("./routes/adminRoutes/AdminGalleryRoutes")
const UserGalleryRoutes = require("./routes/UserRoutes/GalleryRoutes")

const { initSocket } = require("./socket"); 

dotenv.config();

const app = express();

/* ----------------- DATABASE ----------------- */

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

/* ----------------- MIDDLEWARE ----------------- */

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST", "DELETE", "PUT", "PATCH"],
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

/* ----------------- ROUTES ----------------- */

// auth
app.use("/api/auth", authRoutes);

// admin
app.use("/api/admin/events", AdminEventRoutes);
app.use("/api/admin/jobs", AdminJobRoutes);
app.use("/api/admin/news",NewsRoutes)
app.use("/api/admin/gallery",AdminGalleryRoutes)

// user
app.use("/api/user/events", UserEventRoutes);
app.use("/api/user/jobs", UserJobRoutes);
app.use("/api/user/info", UserInfoRoutes);
app.use("/api/user/connect", ConnectionRoutes);
app.use("/api/user/message", messageRoutes);
app.use("/api/user/news",UserNewRoutes)
app.use("/api/user/gallery",UserGalleryRoutes)


/* ----------------- SOCKET SETUP ----------------- */

const server = http.createServer(app);

const io = new Server(server, { 
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true,
  },
});

app.set("io", io);

initSocket(io);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
