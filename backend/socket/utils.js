import User from '../models/User.js';
import { onlineUsers } from './state.js';

export function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function generateLeagueCode() {
  return Math.random().toString(36).substring(2, 4).toUpperCase();
}

export async function updateUserOnlineStatus(userId, isOnline) {
  try {
    await User.findByIdAndUpdate(userId, { isOnline, lastSeen: new Date() });
  } catch (err) {
    console.error("Failed to update online status:", err);
  }
}

export function broadcastOnlineUsers(io) {
  const users = Array.from(onlineUsers.entries()).map(([id, info]) => ({
    id,
    username: info.username,
    rating: info.rating,
    avatar: info.avatar,
  }));
  io.emit("onlineUsers", users);
}

export async function updateUserStats(userId, won) {
  try {
    const update = won
      ? { $inc: { coins: 1000, gamesWon: 1, totalGames: 1 } }
      : { $inc: { coins: -500, gamesLost: 1, totalGames: 1 } };
    await User.findByIdAndUpdate(userId, update);
  } catch (err) {
    console.error("Failed to update user stats:", err);
  }
}

export async function updateChampionStats(championId) {
  try {
    await User.findByIdAndUpdate(championId, { $inc: { championshipsWon: 1 } });
  } catch (err) {
    console.error("Failed to update champion stats:", err);
  }
}