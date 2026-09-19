// models/League.js
import mongoose from 'mongoose';

const LeagueSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    code: { type: String, unique: true, required: true },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    players: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    size: { type: Number, enum: [4, 6, 8, 10], required: true },
    status: { type: String, enum: ['open', 'full', 'in_progress', 'completed'], default: 'open' },
    bracket: { type: mongoose.Schema.Types.Mixed },
    champion: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    startedAt: Date,
    endedAt: Date,
  },
  { timestamps: true }
);

export default mongoose.models.League || mongoose.model('League', LeagueSchema);