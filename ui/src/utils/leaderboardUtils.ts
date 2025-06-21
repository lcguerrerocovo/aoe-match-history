const LEADERBOARD_NAMES: { [key: number]: string } = {
  0: 'Unranked',
  1: 'DM 1v1',
  2: 'DM Team',
  3: 'RM 1v1',
  4: 'RM Team',
  13: 'EW 1v1',
  14: 'EW Team',
  15: 'RM 1v1 (UNR)',
  16: 'RM Team (UNR)',
  17: 'EW 1v1 (UNR)',
  18: 'EW Team (UNR)',
  19: 'RM 1v1 (QM)',
  20: 'RM Team (QM)',
  21: 'EW 1v1 (QM)',
  22: 'EW Team (QM)'
};

export function getLeaderboardName(id: number): string {
  return LEADERBOARD_NAMES[id] ?? 'UNR';
}

export function calculateWinRate(wins: number, losses: number): string {
  const totalGames = wins + losses;
  if (totalGames === 0) return '0.00';
  return (wins / totalGames * 100).toFixed(2);
}

export function calculatePercentile(rank: number, rankTotal: number): string {
  if (rank === -1 || rankTotal === 0) return '0.0';
  return (100 - (rank / rankTotal * 100)).toFixed(1);
} 