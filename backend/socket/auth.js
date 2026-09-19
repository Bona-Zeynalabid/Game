import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET;

export async function socketAuthMiddleware(socket, next) {
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
}