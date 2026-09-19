import 'dotenv/config';
import { createServer } from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";

import { onlineUsers, socketToUser } from "./socket/state.js";
import { updateUserOnlineStatus, broadcastOnlineUsers } from "./socket/utils.js";
import { socketAuthMiddleware } from "./socket/auth.js";
import { registerChallengeHandlers } from "./socket/challenge.js";
import { registerGameHandlers } from "./socket/game.js";
import { registerLeagueHandlers } from "./socket/league.js";

const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET;
const PORT = process.env.PORT || process.env.SOCKET_PORT || 3001;

if (!MONGODB_URI || !JWT_SECRET) {
  console.error("Missing MONGODB_URI or JWT_SECRET");
  process.exit(1);
}

await mongoose.connect(MONGODB_URI);
console.log("Connected to MongoDB");

const httpServer = createServer((req, res) => {
  if (req.url === "/" || req.url === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("OK");
    return;
  }
  res.writeHead(404);
  res.end();
});

const io = new Server(httpServer, {
  cors: {
    origin: [
      process.env.NEXT_PUBLIC_APP_URL,
      "http://localhost:3000",
    ].filter(Boolean),
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

io.use(socketAuthMiddleware);

io.on("connection", async (socket) => {
  const userId = socket.userId;
  console.log(`User connected: ${socket.username} (${socket.id})`);

  onlineUsers.set(userId, {
    socketId: socket.id,
    username: socket.username,
    rating: socket.rating,
    avatar: socket.avatar,
  });
  socketToUser.set(socket.id, userId);

  await updateUserOnlineStatus(userId, true);
  broadcastOnlineUsers(io);

  socket.emit("yourId", userId);

  socket.on("requestState", (callback) => {
    const users = Array.from(onlineUsers.entries()).map(([id, info]) => ({
      id,
      username: info.username,
      rating: info.rating,
      avatar: info.avatar,
    }));
    callback?.({ yourId: userId, onlineUsers: users });
  });

  registerChallengeHandlers(io, socket);
  registerGameHandlers(io, socket);
  registerLeagueHandlers(io, socket);

  socket.on("disconnect", async () => {
    console.log(`User disconnected: ${socket.username} (${socket.id})`);
    socketToUser.delete(socket.id);

    const current = onlineUsers.get(userId);
    if (current && current.socketId === socket.id) {
      onlineUsers.delete(userId);
      await updateUserOnlineStatus(userId, false);
      broadcastOnlineUsers(io);
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`Socket server running on port ${PORT}`);
});