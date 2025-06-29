// Game type/mode utilities
export function matchTypeIdToLeaderboardId(matchTypeId: number): string | null {
  switch (matchTypeId) {
    case 0: return "Unranked";
    case 2: return "DM 1v1";
    case 3:
    case 4:
    case 5: return "DM Team";
    case 6: return "RM 1v1";
    case 7:
    case 8:
    case 9: return "RM Team";
    case 10: return "Battle Royale";
    case 11: return "Quick Match EW";
    case 12: return "Quick Match EW Team";
    case 13: return "Quick Match EW Team";
    case 14: return "Quick Match EW Team";
    case 18: return "Quick Match RM";
    case 19: return "Quick Match RM Team";
    case 20: return "Quick Match RM Team";
    case 21: return "Quick Match RM Team";
    case 25: return "Quick Match BR FFA";
    case 26: return "EW 1v1";
    case 27:
    case 28:
    case 29: return "EW Team";
  }
  return null;
}

export const getGameType = (gameMode: number): string | null => {
  return matchTypeIdToLeaderboardId(gameMode);
};

// Tier/rating utilities
export interface Tier {
  name: string;
  color: string;
  gradient: string;
  showCrown: boolean;
  explainer: string;
}

export const getTier = (elo: number, rank: number): Tier => {
  if (rank === -1) {
    return {
      name: 'Unranked',
      color: 'white',
      gradient: '',
      showCrown: false,
      explainer: 'Unranked player',
    };
  }

  if (elo >= 1600) {
    return {
      name: 'Gold',
      color: 'transparent',
      gradient: 'linear-gradient(to bottom, #FFD700, #D4AF37)',
      showCrown: true,
      explainer: 'Gold: 1600+ Elo',
    };
  }

  if (elo >= 1300) {
    return {
      name: 'Silver',
      color: 'transparent',
      gradient: 'linear-gradient(to bottom, #FFFFFF, #A0A0A0)',
      showCrown: true,
      explainer: 'Silver: 1300-1599 Elo',
    };
  }

  if (elo >= 1000) {
    return {
      name: 'Bronze',
      color: 'transparent',
      gradient: 'linear-gradient(to bottom, #CD7F32, #B87333)',
      showCrown: true,
      explainer: 'Bronze: 1000-1299 Elo',
    };
  }

  return {
    name: 'Iron',
    color: 'white',
    gradient: '',
    showCrown: false,
    explainer: 'Iron: 0-999 Elo',
  };
}; 