import { PLAYER_COLORS } from '../../utils/playerColors';

interface ApmActionData {
  minute: number;
  [actionType: string]: number;
}

// Warm Codex palette — dark/light pairs for stacked bar segments.
// Earth tones, manuscript inks, and natural pigments. Sufficient contrast
// between adjacent colors for stacked bars on parchment backgrounds.
const COLOR_PALETTE = [
  '#7A4A2A', // burnt umber
  '#B08060', // burnt umber – light
  '#8B3A3A', // red chalk
  '#C07060', // red chalk – light
  '#5A6B2A', // olive earth
  '#8A9B5A', // olive earth – light
  '#2A5A5A', // warm teal
  '#5A8A8A', // warm teal – light
  '#6B2A4A', // wine
  '#9C5A7A', // wine – light
  '#8B7020', // ochre
  '#BBA050', // ochre – light
  '#A04A30', // terracotta
  '#C08060', // terracotta – light
  '#4A6B4A', // sage
  '#7A9B7A', // sage – light
  '#5A3A5A', // plum brown
  '#8A6A8A', // plum brown – light
  '#6B6050', // warm stone
  '#9B9080', // warm stone – light
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

// Fallback chart line color (vibrant blue for data visibility)
const CHART_FALLBACK_LIGHT = '#1E4BB8';
const CHART_FALLBACK_DARK = '#90CDF4';

export const getPlayerColor = (colorId: number | undefined, isDark: boolean): string => {
  const fallback = isDark ? CHART_FALLBACK_DARK : CHART_FALLBACK_LIGHT;
  if (colorId !== undefined) {
    return PLAYER_COLORS[colorId] || fallback;
  }
  return fallback;
};
