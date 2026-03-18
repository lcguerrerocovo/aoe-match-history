import { PLAYER_COLORS } from '../../utils/playerColors';

interface ApmActionData {
  minute: number;
  [actionType: string]: number;
}

// Tried-and-true 20-color palette (Tableau / D3 "Tab 20")
// Widely used & battle-tested: classic Tableau/Matplotlib categorical set
// Pairs of dark + light shades make stacked segments easy to decode
// Color-blind robust and print-friendly
const COLOR_PALETTE = [
  '#1f77b4', // blue 1
  '#aec7e8', // blue 1 – light tint
  '#ff7f0e', // orange 1
  '#ffbb78', // orange 1 – light tint
  '#2ca02c', // green 1
  '#98df8a', // green 1 – light tint
  '#d62728', // red 1
  '#ff9896', // red 1 – light tint
  '#9467bd', // purple 1
  '#c5b0d5', // purple 1 – light tint
  '#8c564b', // brown 1
  '#c49c94', // brown 1 – light tint
  '#e377c2', // pink 1
  '#f7b6d2', // pink 1 – light tint
  '#7f7f7f', // gray 1
  '#c7c7c7', // gray 1 – light tint
  '#bcbd22', // olive 1
  '#dbdb8d', // olive 1 – light tint
  '#17becf', // teal 1
  '#9edae5'  // teal 1 – light tint
];

export const getColorByIndex = (index: number): string => {
  return COLOR_PALETTE[index % COLOR_PALETTE.length];
};

export const extractActionTypes = (playerData: ApmActionData[]): string[] => {
  const types = new Set<string>();
  playerData.forEach((minuteData) => {
    Object.keys(minuteData).forEach((key) => {
      if (key !== 'minute' && key !== 'total' && typeof minuteData[key] === 'number') {
        types.add(key);
      }
    });
  });
  return Array.from(types);
};

export const calculateActionTypeTotals = (playerData: ApmActionData[], actionTypes: string[]): Record<string, number> => {
  const totals: Record<string, number> = {};
  actionTypes.forEach(actionType => {
    totals[actionType] = playerData.reduce((sum, minuteData) => {
      return sum + (minuteData[actionType] || 0);
    }, 0);
  });
  return totals;
};

// Fallback color matching brand.zoolanderBlue light/dark
const ZOOLANDER_BLUE_LIGHT = '#1E4BB8';
const ZOOLANDER_BLUE_DARK = '#90CDF4';

export const getPlayerColor = (colorId: number | undefined, isDark: boolean): string => {
  const fallback = isDark ? ZOOLANDER_BLUE_DARK : ZOOLANDER_BLUE_LIGHT;
  if (colorId !== undefined) {
    return PLAYER_COLORS[colorId] || fallback;
  }
  return fallback;
};
