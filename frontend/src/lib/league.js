export function getLeague(user) {
  if (user.championshipsWon > 5) return 'Legendary';
  const coins = user.coins || 0;
  if (coins <= 100) return 'Bronze';
  if (coins <= 20000) return 'Silver';
  if (coins <= 50000) return 'Gold';
  if (coins <= 100000) return 'Platinum';
  return 'Diamond';
}

export function getLeagueColor(league) {
  const colors = {
    Bronze: 'text-amber-600',
    Silver: 'text-gray-400',
    Gold: 'text-yellow-500',
    Platinum: 'text-cyan-400',
    Diamond: 'text-blue-400',
    Legendary: 'text-purple-400',
  };
  return colors[league] || 'text-white';
}