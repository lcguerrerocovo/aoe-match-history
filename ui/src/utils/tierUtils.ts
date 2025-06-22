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
      color: 'brand.gold',
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
    color: 'brand.gold',
    gradient: '',
    showCrown: false,
    explainer: 'Iron: 0-999 Elo',
  };
}; 