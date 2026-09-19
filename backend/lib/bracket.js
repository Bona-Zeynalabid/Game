// lib/bracket.js
export function generateBracket(playerIds) {
  const n = playerIds.length;
  // Shuffle players
  const shuffled = [...playerIds].sort(() => Math.random() - 0.5);

  // Determine number of byes needed to reach next power of 2
  let nextPow2 = 1;
  while (nextPow2 < n) nextPow2 *= 2;
  const byes = nextPow2 - n;

  // Create first round matches
  const round1Matches = [];
  let idx = 0;
  // Assign byes: some players automatically advance
  for (let i = 0; i < byes; i++) {
    const playerId = shuffled[idx++];
    round1Matches.push({ players: [playerId, null], winner: playerId });
  }
  // Pair remaining players
  while (idx < n) {
    round1Matches.push({ players: [shuffled[idx], shuffled[idx + 1]], winner: null });
    idx += 2;
  }

  // Build rounds array
  const rounds = [{ matches: round1Matches }];
  let currentRound = 1;
  while (rounds[currentRound - 1].matches.length > 1) {
    const prevMatches = rounds[currentRound - 1].matches;
    const nextMatches = [];
    for (let i = 0; i < prevMatches.length; i += 2) {
      nextMatches.push({ players: [null, null], winner: null });
    }
    rounds.push({ matches: nextMatches });
    currentRound++;
  }
  return rounds;
}