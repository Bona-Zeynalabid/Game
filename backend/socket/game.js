import { onlineUsers, gameRooms } from './state.js';
import {
  createInitialBoard,
  applyMoveSequence,
  isGameOver,
  getOpponent,
  PLAYER_RED,
  PLAYER_BLACK,
} from '../lib/checkers.js';
import { updateUserStats } from './utils.js';
import { handleLeagueMatchEnd } from './league.js';

export function registerGameHandlers(io, socket) {
  const userId = socket.userId;

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

      io.to(roomCode).emit("moveMade", {
        board: newBoard,
        currentPlayer: room.currentPlayer,
      });

      const opponentColor = getOpponent(playerColor);
      if (isGameOver(newBoard, opponentColor)) {
        const winnerId = playerColor === PLAYER_RED ? room.players[0] : room.players[1];
        const loserId = playerColor === PLAYER_RED ? room.players[1] : room.players[0];

        io.to(roomCode).emit("gameOver", {
          winner: playerColor,
          reason: "No moves left",
        });

        if (room.isLeague) {
          handleLeagueMatchEnd(io, room, winnerId, loserId);
        } else {
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

 socket.on("joinGameRoom", async ({ roomCode }, callback) => {
  let room = gameRooms.get(roomCode);
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

      if (player1) {
        io.to(player1.socketId).emit("gameStart", {
          roomCode,
          board: room.board,
          currentPlayer: PLAYER_RED,
          yourColor: PLAYER_RED,
          myUsername: player1.username,
          opponentUsername: player2?.username || "Opponent",
        });
      }
      if (player2) {
        io.to(player2.socketId).emit("gameStart", {
          roomCode,
          board: room.board,
          currentPlayer: PLAYER_RED,
          yourColor: PLAYER_BLACK,
          myUsername: player2.username,
          opponentUsername: player1?.username || "Opponent",
        });
      }
    } else {
      const opponentId = room.players.find((id) => id !== userId);
      const opponent = onlineUsers.get(opponentId);
      if (opponent) io.to(opponent.socketId).emit("rematchRequest", { from: userId });
    }
    callback?.({ success: true });
  });
}