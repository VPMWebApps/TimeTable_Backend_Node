const jwt = require("jsonwebtoken");

const initSocket = (io) => {
  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    const token = socket.handshake.auth?.token;

    // ── If no token in auth, try cookie ──
    const cookieHeader = socket.handshake.headers?.cookie || "";
    const cookieToken = cookieHeader
      .split(";")
      .find(c => c.trim().startsWith("token="))
      ?.split("=")[1];

    const finalToken = token || cookieToken;

    if (!finalToken) {
      console.log("❌ No token found, disconnecting");
      socket.disconnect();
      return;
    }

    try {
      const decoded = jwt.verify(finalToken, process.env.CLIENT_SECRET_KEY);
      const userId = (decoded.id || decoded._id).toString();

      socket.join(userId);
      console.log(`✅ User ${userId} joined room ${userId}`);

      socket.on("disconnect", () => {
        console.log(`User ${userId} disconnected`);
      });

    } catch (err) {
      console.log("❌ JWT verify failed:", err.message);
      socket.disconnect();
    }
  });
};

const emitToUser = (io, userId, event, payload) => {
  const roomId = userId.toString();
  const room = io.sockets.adapter.rooms.get(roomId);
  console.log(`📤 emitToUser → room: ${roomId}, exists: ${!!room}, size: ${room?.size}, event: ${event}`);
  io.to(roomId).emit(event, payload);
};

module.exports = { initSocket, emitToUser };