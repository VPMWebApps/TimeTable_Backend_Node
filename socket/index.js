const jwt = require("jsonwebtoken");

const onlineUsers = new Map();

const initSocket = (io) => {
  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    const token = socket.handshake.auth?.token;

    if (!token) {
      socket.disconnect();
      return;
    }

    try {
      const decoded = jwt.verify(token, process.env.CLIENT_SECRET_KEY);
      const userId = decoded.id;

      onlineUsers.set(userId.toString(), socket.id);

      socket.on("disconnect", () => {
        onlineUsers.delete(userId.toString());
        console.log("Socket disconnected:", socket.id);
      });

    } catch (err) {
      socket.disconnect();
    }
  });
};

const emitToUser = (io, userId, event, payload) => {
  const socketId = onlineUsers.get(userId.toString());
  if (socketId) {
    io.to(socketId).emit(event, payload);
  }
};

module.exports = { initSocket, emitToUser };
