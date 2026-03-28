import React, { useMemo } from 'react';
import { extractActionTypes, calculateActionTypeTotals } from './utils';
import { ChartArea } from './ChartArea';
export { ActionTypeLegend } from './ActionTypeLegend';

interface ApmActionData {
  minute: number;
  [actionType: string]: number;
}

interface ApmBreakdownChartProps {
  apm: {
    players: Record<string, ApmActionData[]>;
    averages?: Record<string, number>;
  };
  selectedPlayerId: string;
  activeActionTypes: Set<string>;
  actionTypeColorMap: Record<string, number>;
}

export const ApmBreakdownChart: React.FC<ApmBreakdownChartProps> = ({
  apm,
  selectedPlayerId,
  activeActionTypes,
  actionTypeColorMap,
}) => {
  const playerIds = Object.keys(apm?.players ?? {});

  const currentPlayerData = useMemo(() => {
    if (!selectedPlayerId || !apm?.players?.[selectedPlayerId]) return null;
    const data = apm.players[selectedPlayerId];
    return Array.isArray(data) ? data : null;
  }, [apm, selectedPlayerId]);

  const allActionTypes = useMemo(() => {
    if (!currentPlayerData) return [];
    return extractActionTypes(currentPlayerData);
  }, [currentPlayerData]);

  const chartData = useMemo(() => {
    if (!currentPlayerData) return [];
    return currentPlayerData.map((minuteData) => {
      const transformed: Record<string, number | string> = { minute: minuteData.minute };
      allActionTypes.forEach((actionType) => {
        if (activeActionTypes.has(actionType)) {
          transformed[actionType] = minuteData[actionType] || 0;
        }
      });
      return transformed;
    });
  }, [currentPlayerData, allActionTypes, activeActionTypes]);

  const activeActionTypesWithStats = useMemo(() => {
    if (!currentPlayerData) return [];
    const totals = calculateActionTypeTotals(currentPlayerData, allActionTypes);
    const activeTotals = Object.entries(totals)
      .filter(([actionType]) => activeActionTypes.has(actionType))
      .map(([actionType, total]) => ({ actionType, total }));
    const totalActions = activeTotals.reduce((sum, stat) => sum + stat.total, 0);
    return activeTotals
      .map((stat) => ({
        ...stat,
        percentage: totalActions > 0 ? Math.round((stat.total / totalActions) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [currentPlayerData, allActionTypes, activeActionTypes]);

  if (!playerIds.length) return null;

  return (
    <ChartArea
      chartData={chartData}
      activeActionTypesWithStats={activeActionTypesWithStats}
      actionTypeColorMap={actionTypeColorMap}
    />
  );
};
