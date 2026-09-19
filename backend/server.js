// server.js
import 'dotenv/config';
import { createServer } from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "./models/User.js";

import League from "./models/League.js";
import {
  createInitialBoard,
  applyMoveSequence,
  isGameOver,
  getOpponent,
  PLAYER_RED,
  PLAYER_BLACK
} from "./lib/checkers.js";
import { generateBracket } from "./lib/bracket.js";

const JWT_SECRET = process.env.JWT_SECRET;
const MONGODB_URI = process.env.MONGODB_URI;
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
    origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

const onlineUsers = new Map();
const socketToUser = new Map();
const gameRooms = new Map();
const pendingChallenges = new Map();
const leagues = new Map();
const leagueMatchRooms = new Map();

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("Authentication required"));
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) return next(new Error("User not found"));
    socket.userId = user._id.toString();
    socket.username = user.username;
    socket.rating = user.rating || 1000;
    socket.avatar = user.avatar || null;
    next();
  } catch (err) {
    next(new Error("Invalid token"));
  }
});

io.on("connection", (socket) => {
  const userId = socket.userId;
  console.log(`User connected: ${socket.username}`);

  onlineUsers.set(userId, {
    socketId: socket.id,
    username: socket.username,
    rating: socket.rating,
    avatar: socket.avatar,
  });
  socketToUser.set(socket.id, userId);
  updateUserOnlineStatus(userId, true);
  broadcastOnlineUsers();
  socket.emit("yourId", userId);

  // ---------- Challenge handlers ----------
  socket.on("challenge", ({ targetUserId }, callback) => {
    const target = onlineUsers.get(targetUserId);
    if (!target) return callback?.({ error: "User is offline" });
    clearChallenge(userId);
    clearChallenge(targetUserId);
    const timeout = setTimeout(() => {
      io.to(socket.id).emit("challengeExpired", { targetUserId });
      pendingChallenges.delete(userId);
    }, 30000);
    pendingChallenges.set(userId, { targetUserId, timeout });
    io.to(target.socketId).emit("challengeReceived", {
      challengerId: userId,
      challengerUsername: socket.username,
    });
    callback?.({ success: true });
  });

  socket.on("challengeResponse", ({ challengerId, accept }) => {
    const challenger = onlineUsers.get(challengerId);
    const challenge = pendingChallenges.get(challengerId);
    if (!challenge || !challenger) return;
    clearTimeout(challenge.timeout);
    pendingChallenges.delete(challengerId);
    if (!accept) {
      io.to(challenger.socketId).emit("challengeDeclined", { targetId: userId });
      return;
    }
    const roomCode = generateRoomCode();
    const room = {
      code: roomCode,
      players: [challengerId, userId],
      board: createInitialBoard(),
      currentPlayer: PLAYER_RED,
      status: "playing",
      rematchRequests: new Set(),
      isLeague: false,
    };
    gameRooms.set(roomCode, room);
    socket.join(roomCode);
    io.sockets.sockets.get(challenger.socketId)?.join(roomCode);
    io.to(challenger.socketId).emit("gameStart", {
      roomCode,
      board: room.board,
      currentPlayer: room.currentPlayer,
      yourColor: PLAYER_RED,
      myUsername: challenger.username,
      opponentUsername: socket.username,
    });
    socket.emit("gameStart", {
      roomCode,
      board: room.board,
      currentPlayer: room.currentPlayer,
      yourColor: PLAYER_BLACK,
      myUsername: socket.username,
      opponentUsername: challenger.username,
    });
  });

  // ---------- Game move ----------
  socket.on("move", ({ roomCode, steps }, callback = null) => {
    const room = gameRooms.get(roomCode);
    if (!room) return callback?.({ error: "Room not found" });
    const playerIndex = room.players.indexOf(userId);
    const playerColor = playerIndex === 0 ? PLAYER_RED : PLAYER_BLACK;
    if (room.currentPlayer !== playerColor) return callback?.({ error: "Not your turn" });
    try {
      const newBoard = applyMoveSequence(room.board, steps);
      room.board = newBoard;
      room.currentPlayer = getOpponent(playerColor);
      io.to(roomCode).emit("moveMade", { board: newBoard, currentPlayer: room.currentPlayer });
      const opponentColor = getOpponent(playerColor);
      if (isGameOver(newBoard, opponentColor)) {
        const winnerId = playerColor === PLAYER_RED ? room.players[0] : room.players[1];
        const loserId = playerColor === PLAYER_RED ? room.players[1] : room.players[0];
        io.to(roomCode).emit("gameOver", { winner: playerColor, reason: "No moves left" });
        if (room.isLeague) {
          handleLeagueMatchEnd(room, winnerId, loserId);
        } else {
          // Update stats for normal multiplayer
          updateUserStats(winnerId, true);
          updateUserStats(loserId, false);
          gameRooms.delete(roomCode);
        }
      }
      callback?.({ success: true });
    } catch (e) {
      console.error("Move error:", e);
      callback?.({ error: "Invalid move" });
    }
  });

  // ---------- Join game room (for reconnection) ----------
  socket.on("joinGameRoom", ({ roomCode }, callback) => {
    const room = gameRooms.get(roomCode);
    if (!room) return callback?.({ error: "Room not found" });
    if (!room.players.includes(userId)) return callback?.({ error: "Not part of this room" });
    socket.join(roomCode);
    const playerColor = room.players[0] === userId ? PLAYER_RED : PLAYER_BLACK;
    socket.emit("gameState", {
      board: room.board,
      currentPlayer: room.currentPlayer,
      myColor: playerColor,
      roomCode,
    });
    callback?.({ success: true });
  });

  // ---------- Rematch ----------
  socket.on("rematch", ({ roomCode }, callback = null) => {
    const room = gameRooms.get(roomCode);
    if (!room) return callback?.({ error: "Room not found" });
    if (!room.players.includes(userId)) return callback?.({ error: "Not in room" });
    room.rematchRequests.add(userId);
    if (room.rematchRequests.size === 2) {
      room.board = createInitialBoard();
      room.currentPlayer = PLAYER_RED;
      room.rematchRequests.clear();
      const player1 = onlineUsers.get(room.players[0]);
      const player2 = onlineUsers.get(room.players[1]);
      io.to(player1.socketId).emit("gameStart", {
        roomCode,
        board: room.board,
        currentPlayer: PLAYER_RED,
        yourColor: PLAYER_RED,
        myUsername: player1.username,
        opponentUsername: player2.username,
      });
      io.to(player2.socketId).emit("gameStart", {
        roomCode,
        board: room.board,
        currentPlayer: PLAYER_RED,
        yourColor: PLAYER_BLACK,
        myUsername: player2.username,
        opponentUsername: player1.username,
      });
    } else {
      const opponentId = room.players.find(id => id !== userId);
      const opponent = onlineUsers.get(opponentId);
      if (opponent) io.to(opponent.socketId).emit("rematchRequest", { from: userId });
    }
    callback?.({ success: true });
  });

  // ---------- League handlers ----------
  socket.on("createLeague", async ({ name, size }, callback) => {
    try {
      if (![4, 6, 8, 10].includes(size)) return callback?.({ error: "Invalid league size" });
      const code = generateLeagueCode();
      const league = {
        code,
        name,
        creator: userId,
        players: [userId],
        size,
        status: "open",
        bracket: null,
        champion: null,
        socketIds: [socket.id],
        playerNames: { [userId]: socket.username },
      };
      leagues.set(code, league);
      await League.create({ name, code, creator: userId, players: [userId], size, status: "open" });
      callback?.({ success: true, code });
    } catch (err) {
      console.error("Create league error:", err);
      callback?.({ error: "Failed to create league" });
    }
  });

  socket.on("joinLeague", async ({ code }, callback) => {
    const league = leagues.get(code);
    if (!league) return callback?.({ error: "League not found" });
    if (league.status !== "open") return callback?.({ error: "League is full or already started" });
    if (league.players.includes(userId)) return callback?.({ error: "Already in league" });
    if (league.players.length >= league.size) return callback?.({ error: "League is full" });
    league.players.push(userId);
    league.socketIds.push(socket.id);
    league.playerNames[userId] = socket.username;
    await League.findOneAndUpdate({ code }, { $push: { players: userId } });
    if (league.players.length === league.size) {
      league.status = "in_progress";
      league.bracket = generateBracket(league.players);
      league.startedAt = new Date();
      await League.findOneAndUpdate({ code }, { status: "in_progress", bracket: league.bracket, startedAt: league.startedAt });
      io.to(Array.from(league.socketIds)).emit("leagueUpdate", {
        code,
        status: league.status,
        players: league.players,
        bracket: league.bracket,
        size: league.size,
        playerNames: league.playerNames,
      });
      startRound(league, 0);
    } else {
      io.to(Array.from(league.socketIds)).emit("leagueUpdate", {
        code,
        status: league.status,
        players: league.players,
        size: league.size,
        playerNames: league.playerNames,
      });
    }
    callback?.({ success: true });
  });

  socket.on("getMyLeagues", async (callback) => {
    try {
      const userLeagues = await League.find({ players: userId }).select('code name size status players').lean();
      callback?.({ leagues: userLeagues });
    } catch (err) {
      console.error("Get my leagues error:", err);
      callback?.({ error: "Failed to fetch leagues" });
    }
  });

  socket.on("getLeague", async ({ code }, callback) => {
    let league = leagues.get(code);
    if (!league) {
      const leagueDoc = await League.findOne({ code }).lean();
      if (!leagueDoc) return callback?.({ error: "League not found" });
      const players = leagueDoc.players.map(p => p.toString());
      const bracket = leagueDoc.bracket ? leagueDoc.bracket.map(round => ({
        matches: round.matches.map(match => ({
          players: match.players.map(p => p ? p.toString() : null),
          winner: match.winner ? match.winner.toString() : null,
          roomCode: match.roomCode || null,
        }))
      })) : null;
      league = {
        code: leagueDoc.code,
        name: leagueDoc.name,
        creator: leagueDoc.creator.toString(),
        players,
        size: leagueDoc.size,
        status: leagueDoc.status,
        bracket,
        champion: leagueDoc.champion?.toString() || null,
        socketIds: [],
        playerNames: {},
      };
      const users = await User.find({ _id: { $in: players } }).select('username').lean();
      users.forEach(u => { league.playerNames[u._id.toString()] = u.username; });
      leagues.set(code, league);
    }

    if (league.bracket && (league.status === 'in_progress' || league.status === 'full')) {
      await ensureMatchRooms(league);
    }

    let myMatch = null;
    if (league.bracket) {
      for (let r = 0; r < league.bracket.length; r++) {
        for (let m = 0; m < league.bracket[r].matches.length; m++) {
          const match = league.bracket[r].matches[m];
          if (match.players.includes(userId) && match.winner === null && match.roomCode) {
            const opponentId = match.players.find(id => id !== userId);
            const opponent = onlineUsers.get(opponentId);
            const room = gameRooms.get(match.roomCode);
            myMatch = {
              roomCode: match.roomCode,
              roundIndex: r,
              matchIndex: m,
              opponentUsername: opponent ? opponent.username : league.playerNames[opponentId] || 'Unknown',
              yourColor: match.players[0] === userId ? PLAYER_RED : PLAYER_BLACK,
              board: room ? room.board : createInitialBoard(),
              currentPlayer: room ? room.currentPlayer : PLAYER_RED,
            };
            break;
          }
        }
        if (myMatch) break;
      }
    }

    callback?.({
      code: league.code,
      name: league.name,
      players: league.players,
      size: league.size,
      status: league.status,
      bracket: league.bracket,
      champion: league.champion,
      playerNames: league.playerNames,
      myMatch,
    });
  });

  socket.on("disconnect", () => {
    onlineUsers.delete(userId);
    socketToUser.delete(socket.id);
    updateUserOnlineStatus(userId, false);
    broadcastOnlineUsers();
    clearChallenge(userId);
  });

  function clearChallenge(userId) {
    const challenge = pendingChallenges.get(userId);
    if (challenge) {
      clearTimeout(challenge.timeout);
      pendingChallenges.delete(userId);
    }
  }

  function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  function generateLeagueCode() {
    return Math.random().toString(36).substring(2, 4).toUpperCase();
  }

  async function updateUserOnlineStatus(userId, isOnline) {
    try {
      await User.findByIdAndUpdate(userId, { isOnline, lastSeen: new Date() });
    } catch (err) {
      console.error("Failed to update online status:", err);
    }
  }

  function broadcastOnlineUsers() {
    const users = Array.from(onlineUsers.entries()).map(([id, info]) => ({
      id,
      username: info.username,
      rating: info.rating,
      avatar: info.avatar,
    }));
    io.emit("onlineUsers", users);
  }

  async function startRound(league, roundIndex) {
    const round = league.bracket[roundIndex];
    for (let i = 0; i < round.matches.length; i++) {
      const match = round.matches[i];
      if (match.players[1] === null) {
        match.winner = match.players[0];
        continue;
      }
      if (match.roomCode && gameRooms.has(match.roomCode)) {
        continue;
      }
      const roomCode = generateRoomCode();
      const player1 = match.players[0];
      const player2 = match.players[1];
      const room = {
        code: roomCode,
        players: [player1, player2],
        board: createInitialBoard(),
        currentPlayer: PLAYER_RED,
        status: "playing",
        rematchRequests: new Set(),
        isLeague: true,
        leagueCode: league.code,
        roundIndex,
        matchIndex: i,
      };
      gameRooms.set(roomCode, room);
      leagueMatchRooms.set(roomCode, {
        leagueCode: league.code,
        roundIndex,
        matchIndex: i,
        players: [player1, player2],
      });
      match.roomCode = roomCode;

      const player1SocketId = onlineUsers.get(player1)?.socketId;
      const player2SocketId = onlineUsers.get(player2)?.socketId;
      if (player1SocketId) {
        const p1Socket = io.sockets.sockets.get(player1SocketId);
        if (p1Socket) p1Socket.join(roomCode);
        io.to(player1SocketId).emit("leagueMatchReady", {
          roomCode,
          opponentUsername: league.playerNames[player2] || 'Unknown',
          yourColor: PLAYER_RED,
          leagueCode: league.code,
          roundIndex,
        });
      }
      if (player2SocketId) {
        const p2Socket = io.sockets.sockets.get(player2SocketId);
        if (p2Socket) p2Socket.join(roomCode);
        io.to(player2SocketId).emit("leagueMatchReady", {
          roomCode,
          opponentUsername: league.playerNames[player1] || 'Unknown',
          yourColor: PLAYER_BLACK,
          leagueCode: league.code,
          roundIndex,
        });
      }
    }
    await League.findOneAndUpdate({ code: league.code }, { bracket: league.bracket });
    if (round.matches.every(m => m.winner !== null)) {
      advanceRound(league, roundIndex);
    }
  }

  async function ensureMatchRooms(league) {
    for (let r = 0; r < league.bracket.length; r++) {
      const round = league.bracket[r];
      for (let m = 0; m < round.matches.length; m++) {
        const match = round.matches[m];
        if (match.players[0] && match.players[1] && !match.winner && (!match.roomCode || !gameRooms.has(match.roomCode))) {
          const roomCode = generateRoomCode();
          const room = {
            code: roomCode,
            players: [match.players[0], match.players[1]],
            board: createInitialBoard(),
            currentPlayer: PLAYER_RED,
            status: "playing",
            rematchRequests: new Set(),
            isLeague: true,
            leagueCode: league.code,
            roundIndex: r,
            matchIndex: m,
          };
          gameRooms.set(roomCode, room);
          leagueMatchRooms.set(roomCode, {
            leagueCode: league.code,
            roundIndex: r,
            matchIndex: m,
            players: match.players,
          });
          match.roomCode = roomCode;

          const player1SocketId = onlineUsers.get(match.players[0])?.socketId;
          const player2SocketId = onlineUsers.get(match.players[1])?.socketId;
          if (player1SocketId) {
            const p1Socket = io.sockets.sockets.get(player1SocketId);
            if (p1Socket) p1Socket.join(roomCode);
            io.to(player1SocketId).emit("leagueMatchReady", {
              roomCode,
              opponentUsername: league.playerNames[match.players[1]] || 'Unknown',
              yourColor: PLAYER_RED,
              leagueCode: league.code,
              roundIndex: r,
            });
          }
          if (player2SocketId) {
            const p2Socket = io.sockets.sockets.get(player2SocketId);
            if (p2Socket) p2Socket.join(roomCode);
            io.to(player2SocketId).emit("leagueMatchReady", {
              roomCode,
              opponentUsername: league.playerNames[match.players[0]] || 'Unknown',
              yourColor: PLAYER_BLACK,
              leagueCode: league.code,
              roundIndex: r,
            });
          }
        }
      }
    }
    await League.findOneAndUpdate({ code: league.code }, { bracket: league.bracket });
  }

  function handleLeagueMatchEnd(room, winnerId, loserId) {
    // Update stats
    updateUserStats(winnerId, true);
    updateUserStats(loserId, false);

    const league = leagues.get(room.leagueCode);
    if (!league) return;
    const match = league.bracket[room.roundIndex].matches[room.matchIndex];
    match.winner = winnerId;

    io.to(Array.from(league.socketIds)).emit("leagueUpdate", {
      code: league.code,
      bracket: league.bracket,
      playerNames: league.playerNames,
      players: league.players,
    });

    gameRooms.delete(room.code);
    leagueMatchRooms.delete(room.code);

    const round = league.bracket[room.roundIndex];
    if (round.matches.every(m => m.winner !== null)) {
      advanceRound(league, room.roundIndex);
    }
  }

  function advanceRound(league, roundIndex) {
    if (roundIndex === league.bracket.length - 1) {
      league.status = "completed";
      league.champion = league.bracket[roundIndex].matches[0].winner;
      league.endedAt = new Date();
      // Update champion stats
      updateChampionStats(league.champion);
      League.findOneAndUpdate({ code: league.code }, { status: "completed", champion: league.champion, endedAt: league.endedAt });
      io.to(Array.from(league.socketIds)).emit("leagueCompleted", {
        champion: league.champion,
        leagueCode: league.code,
        playerNames: league.playerNames,
      });
      leagues.delete(league.code);
      return;
    }

    const currentRoundMatches = league.bracket[roundIndex].matches;
    const nextRoundMatches = league.bracket[roundIndex + 1].matches;
    let nextIdx = 0;
    for (let i = 0; i < currentRoundMatches.length; i += 2) {
      nextRoundMatches[nextIdx].players = [currentRoundMatches[i].winner, currentRoundMatches[i + 1].winner];
      nextIdx++;
    }
    startRound(league, roundIndex + 1);
  }

  async function updateUserStats(userId, won) {
    try {
      const update = won
        ? { $inc: { coins: 1000, gamesWon: 1, totalGames: 1 } }
        : { $inc: { coins: -500, gamesLost: 1, totalGames: 1 } };
      await User.findByIdAndUpdate(userId, update);
    } catch (err) {
      console.error("Failed to update user stats:", err);
    }
  }

  async function updateChampionStats(championId) {
    try {
      await User.findByIdAndUpdate(championId, { $inc: { championshipsWon: 1 } });
    } catch (err) {
      console.error("Failed to update champion stats:", err);
    }
  }
});

httpServer.listen(PORT, () => {
  console.log(`Socket server running on port ${PORT}`);
});