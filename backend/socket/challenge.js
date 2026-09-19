import { onlineUsers, pendingChallenges, gameRooms } from './state.js';
import { generateRoomCode } from './utils.js';
import { createInitialBoard, PLAYER_RED, PLAYER_BLACK } from '../lib/checkers.js';

export function registerChallengeHandlers(io, socket) {
  const userId = socket.userId;

  function clearChallenge(targetId) {
    const c = pendingChallenges.get(targetId);
    if (c) {
      clearTimeout(c.timeout);
      pendingChallenges.delete(targetId);
    }
  }

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

    if (!challenge || !challenger) {
      socket.emit("challengeExpired", {});
      return;
    }

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
    const challengerSocket = io.sockets.sockets.get(challenger.socketId);
    if (challengerSocket) challengerSocket.join(roomCode);

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
}