import League from '../models/League.js';
import User from '../models/User.js';
import { generateBracket } from '../lib/bracket.js';
import {
  createInitialBoard,
  PLAYER_RED,
  PLAYER_BLACK,
} from '../lib/checkers.js';
import {
  onlineUsers,
  leagues,
  gameRooms,
  leagueMatchRooms,
} from './state.js';
import {
  generateRoomCode,
  generateLeagueCode,
  updateUserStats,
  updateChampionStats,
} from './utils.js';

export function registerLeagueHandlers(io, socket) {
  const userId = socket.userId;

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
  const normalizedCode = String(code || "").trim().toUpperCase();

  // Try memory first
  let league = leagues.get(normalizedCode);

  // Fall back to DB
  if (!league) {
    const leagueDoc = await League.findOne({ code: normalizedCode }).lean();
    if (!leagueDoc) return callback?.({ error: "League not found" });

    const players = leagueDoc.players.map((p) => p.toString());
    const bracket = leagueDoc.bracket
      ? leagueDoc.bracket.map((round) => ({
          matches: round.matches.map((match) => ({
            players: match.players.map((p) => (p ? p.toString() : null)),
            winner: match.winner ? match.winner.toString() : null,
            roomCode: match.roomCode || null,
          })),
        }))
      : null;

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

    const users = await User.find({ _id: { $in: players } }).select("username").lean();
    users.forEach((u) => {
      league.playerNames[u._id.toString()] = u.username;
    });

    leagues.set(normalizedCode, league);
  }

  if (league.status !== "open") return callback?.({ error: "League is full or already started" });
  if (league.players.includes(userId)) return callback?.({ error: "Already in league" });
  if (league.players.length >= league.size) return callback?.({ error: "League is full" });

  league.players.push(userId);
  league.socketIds.push(socket.id);
  league.playerNames[userId] = socket.username;
  await League.findOneAndUpdate({ code: normalizedCode }, { $push: { players: userId } });

  if (league.players.length === league.size) {
    league.status = "in_progress";
    league.bracket = generateBracket(league.players);
    league.startedAt = new Date();
    await League.findOneAndUpdate(
      { code: normalizedCode },
      { status: "in_progress", bracket: league.bracket, startedAt: league.startedAt }
    );

    io.to(Array.from(league.socketIds)).emit("leagueUpdate", {
      code: normalizedCode,
      status: league.status,
      players: league.players,
      bracket: league.bracket,
      size: league.size,
      playerNames: league.playerNames,
    });
    startRound(io, league, 0);
  } else {
    io.to(Array.from(league.socketIds)).emit("leagueUpdate", {
      code: normalizedCode,
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
      const userLeagues = await League.find({ players: userId })
        .select("code name size status players")
        .lean();
      callback?.({ leagues: userLeagues });
    } catch (err) {
      console.error("Get my leagues error:", err);
      callback?.({ error: "Failed to fetch leagues" });
    }
  });

socket.on("getLeague", async ({ code }, callback) => {
  const normalizedCode = String(code || "").trim().toUpperCase();

  let league = leagues.get(normalizedCode);
  if (!league) {
    const leagueDoc = await League.findOne({ code: normalizedCode }).lean();
    if (!leagueDoc) return callback?.({ error: "League not found" });

    const players = leagueDoc.players.map((p) => p.toString());
    const bracket = leagueDoc.bracket
      ? leagueDoc.bracket.map((round) => ({
          matches: round.matches.map((match) => ({
            players: match.players.map((p) => (p ? p.toString() : null)),
            winner: match.winner ? match.winner.toString() : null,
            roomCode: match.roomCode || null,
          })),
        }))
      : null;

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
    const users = await User.find({ _id: { $in: players } }).select("username").lean();
    users.forEach((u) => {
      league.playerNames[u._id.toString()] = u.username;
    });
    leagues.set(normalizedCode, league);
  }

  // Always ensure active match rooms exist (also recreates after server restart)
  if (league.bracket && (league.status === "in_progress" || league.status === "full")) {
    await ensureMatchRooms(io, league);
  }

  // ensureMatchRooms may have updated the bracket in memory; re-read from DB
  let freshBracket = league.bracket;
  const freshDoc = await League.findOne({ code: normalizedCode }).lean();
  if (freshDoc?.bracket) {
    freshBracket = freshDoc.bracket.map((round) => ({
      matches: round.matches.map((match) => ({
        players: match.players.map((p) => (p ? p.toString() : null)),
        winner: match.winner ? match.winner.toString() : null,
        roomCode: match.roomCode || null,
      })),
    }));
    league.bracket = freshBracket;
  }

  let myMatch = null;
  if (freshBracket) {
    for (let r = 0; r < freshBracket.length; r++) {
      for (let m = 0; m < freshBracket[r].matches.length; m++) {
        const match = freshBracket[r].matches[m];
        if (match.players.includes(userId) && match.winner === null && match.roomCode) {
          const opponentId = match.players.find((id) => id !== userId);
          const opponent = onlineUsers.get(opponentId);
          const room = gameRooms.get(match.roomCode);
          myMatch = {
            roomCode: match.roomCode,
            roundIndex: r,
            matchIndex: m,
            opponentUsername:
              opponent ? opponent.username : league.playerNames[opponentId] || "Unknown",
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
    bracket: freshBracket,
    champion: league.champion,
    playerNames: league.playerNames,
    myMatch,
  });
});
}

export async function startRound(io, league, roundIndex) {
  const round = league.bracket[roundIndex];

  for (let i = 0; i < round.matches.length; i++) {
    const match = round.matches[i];

    if (match.players[1] === null) {
      match.winner = match.players[0];
      continue;
    }

    if (match.roomCode && gameRooms.has(match.roomCode)) continue;

    const roomCode = generateRoomCode();
    const [player1, player2] = match.players;

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

    notifyPlayersForMatch(io, league, roomCode, player1, player2, roundIndex);
  }

  await League.findOneAndUpdate({ code: league.code }, { bracket: league.bracket });

  if (round.matches.every((m) => m.winner !== null)) {
    advanceRound(io, league, roundIndex);
  }
}

export async function ensureMatchRooms(io, league) {
  for (let r = 0; r < league.bracket.length; r++) {
    const round = league.bracket[r];
    for (let m = 0; m < round.matches.length; m++) {
      const match = round.matches[m];
      const needsRoom =
        match.players[0] &&
        match.players[1] &&
        !match.winner &&
        (!match.roomCode || !gameRooms.has(match.roomCode));

      if (!needsRoom) continue;

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

      notifyPlayersForMatch(io, league, roomCode, match.players[0], match.players[1], r);
    }
  }
  await League.findOneAndUpdate({ code: league.code }, { bracket: league.bracket });
}

function notifyPlayersForMatch(io, league, roomCode, player1, player2, roundIndex) {
  const p1SocketId = onlineUsers.get(player1)?.socketId;
  const p2SocketId = onlineUsers.get(player2)?.socketId;

  if (p1SocketId) {
    const s = io.sockets.sockets.get(p1SocketId);
    if (s) s.join(roomCode);
    io.to(p1SocketId).emit("leagueMatchReady", {
      roomCode,
      opponentUsername: league.playerNames[player2] || "Unknown",
      myUsername: league.playerNames[player1] || "You",
      yourColor: PLAYER_RED,
      leagueCode: league.code,
      roundIndex,
    });
  }
  if (p2SocketId) {
    const s = io.sockets.sockets.get(p2SocketId);
    if (s) s.join(roomCode);
    io.to(p2SocketId).emit("leagueMatchReady", {
      roomCode,
      opponentUsername: league.playerNames[player1] || "Unknown",
      myUsername: league.playerNames[player2] || "You",
      yourColor: PLAYER_BLACK,
      leagueCode: league.code,
      roundIndex,
    });
  }
}

export function handleLeagueMatchEnd(io, room, winnerId, loserId) {
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
  if (round.matches.every((m) => m.winner !== null)) {
    advanceRound(io, league, room.roundIndex);
  }
}

function advanceRound(io, league, roundIndex) {
  const isFinal = roundIndex === league.bracket.length - 1;

  if (isFinal) {
    league.status = "completed";
    league.champion = league.bracket[roundIndex].matches[0].winner;
    league.endedAt = new Date();
    updateChampionStats(league.champion);

    League.findOneAndUpdate(
      { code: league.code },
      { status: "completed", champion: league.champion, endedAt: league.endedAt }
    );

    io.to(Array.from(league.socketIds)).emit("leagueCompleted", {
      champion: league.champion,
      leagueCode: league.code,
      playerNames: league.playerNames,
    });
    leagues.delete(league.code);
    return;
  }

  const currentMatches = league.bracket[roundIndex].matches;
  const nextMatches = league.bracket[roundIndex + 1].matches;
  let nextIdx = 0;
  for (let i = 0; i < currentMatches.length; i += 2) {
    nextMatches[nextIdx].players = [currentMatches[i].winner, currentMatches[i + 1].winner];
    nextIdx++;
  }
  startRound(io, league, roundIndex + 1);
}