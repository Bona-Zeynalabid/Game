// Shared in-memory state across all socket handlers

export const onlineUsers = new Map();       // userId -> { socketId, username, rating, avatar }
export const socketToUser = new Map();      // socketId -> userId
export const gameRooms = new Map();         // roomCode -> room
export const pendingChallenges = new Map(); // userId -> { targetUserId, timeout }
export const leagues = new Map();           // code -> league
export const leagueMatchRooms = new Map();  // roomCode -> { leagueCode, roundIndex, matchIndex, players }