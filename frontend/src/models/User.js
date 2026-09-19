import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    googleId: { type: String, unique: true, sparse: true },
    email: { type: String, unique: true, sparse: true },
    username: { type: String, unique: true, required: true },
    avatar: { type: String },
    displayName: { type: String },
    coins: { type: Number, default: 1000 },
    gamesWon: { type: Number, default: 0 },
    gamesLost: { type: Number, default: 0 },
    gamesDrawn: { type: Number, default: 0 },
    championshipsWon: { type: Number, default: 0 },
    totalGames: { type: Number, default: 0 },
    rating: { type: Number, default: 1000 },
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },
  },
  {
    collection: 'game_users',   // 👈 custom collection name
    timestamps: true,
  }
);


export default mongoose.models.User || mongoose.model('User', UserSchema);