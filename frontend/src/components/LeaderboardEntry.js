import React from 'react';
import Avatar from './Avatar';

const LeaderboardEntry = ({ rank, username, rating, gamesWon, avatar, isCurrentUser = false }) => {
  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-xl border ${
        isCurrentUser ? 'border-yellow-bright bg-yellow-bright/10' : 'border-dark-600 bg-dark-800'
      } hover:border-yellow-bright/50 transition-colors`}
    >
      <div className="w-10 text-center">
        <span className={`text-xl font-bold ${rank <= 3 ? 'text-yellow-bright' : 'text-gray-400'}`}>
          {rank}
        </span>
      </div>
      <Avatar src={avatar} alt={username} size="sm" />
      <div className="flex-1">
        <div className="font-semibold text-white">{username}</div>
        <div className="text-sm text-gray-400">Won: {gamesWon}</div>
      </div>
      <div className="text-right">
        <div className="text-lg font-bold text-yellow-bright">{rating}</div>
        <div className="text-xs text-gray-500">rating</div>
      </div>
    </div>
  );
};

export default LeaderboardEntry;