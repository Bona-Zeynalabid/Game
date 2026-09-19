import React from 'react';
import { Trophy, Coins, Swords, Crown, TrendingUp, Gamepad2 } from 'lucide-react';

const iconMap = {
  coins: Coins,
  gamesWon: Trophy,
  gamesLost: Swords,
  gamesDrawn: Gamepad2,
  championshipsWon: Crown,
  rating: TrendingUp,
};

const StatCard = ({ icon, value, label }) => {
  const Icon = iconMap[icon] || Coins;
  return (
    <div className="bg-dark-800 p-4 rounded-xl border border-dark-600 flex items-center gap-3 hover:border-yellow-bright/50 transition-colors">
      <div className="p-2 rounded-lg bg-yellow-bright/10">
        <Icon className="w-6 h-6 text-yellow-bright" />
      </div>
      <div>
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="text-sm text-gray-400">{label}</div>
      </div>
    </div>
  );
};

export default StatCard;