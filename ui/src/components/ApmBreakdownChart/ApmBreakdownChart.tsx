import React, { useMemo, useState } from 'react';
import { Box } from '@chakra-ui/react';
import { extractActionTypes, calculateActionTypeTotals } from './utils';
import { ChartArea } from './ChartArea';
import { ActionTypeLegend } from './ActionTypeLegend';
import { ChartViewport } from '../Analysis/ChartViewport';

interface ApmActionData {
  minute: number;
  [actionType: string]: number;
}

interface ApmBreakdownChartProps {
  apm: {
    players: Record<string, ApmActionData[]>;
    averages?: Record<string, number>;
  };
  nameByProfile?: Record<string, string | undefined>;
  colorByProfile?: Record<string, number | undefined>;
  selectedPlayerId: string;
}

export const ApmBreakdownChart: React.FC<ApmBreakdownChartProps> = ({
  apm,
  selectedPlayerId,
}) => {
  const playerIds = Object.keys(apm?.players ?? {});
  const [activeActionTypes, setActiveActionTypes] = useState<Set<string>>(new Set());

  // Get current player data
  const currentPlayerData = useMemo(() => {
    if (!selectedPlayerId || !apm?.players?.[selectedPlayerId]) {
      return null;
    }
    const data = apm.players[selectedPlayerId];
    return Array.isArray(data) ? data : null;
  }, [apm, selectedPlayerId]);

  // Extract action types for current player
  const allActionTypes = useMemo(() => {
    if (!currentPlayerData) return [];
    return extractActionTypes(currentPlayerData);
  }, [currentPlayerData]);

  // Calculate action type totals and create color mapping
  const actionTypeColorMap = useMemo(() => {
    if (!currentPlayerData) return {};

    const totals = calculateActionTypeTotals(currentPlayerData, allActionTypes);

    // Sort action types by total frequency (descending) and assign colors
    const sortedActionTypes = Object.entries(totals)
      .sort(([, a], [, b]) => b - a)
      .map(([actionType]) => actionType);

    const map: Record<string, number> = {};
    sortedActionTypes.forEach((actionType, index) => {
      map[actionType] = index;
    });

    return map;
  }, [currentPlayerData, allActionTypes]);

  // Initialize active action types when player changes
  React.useEffect(() => {
    setActiveActionTypes(new Set(allActionTypes));
  }, [allActionTypes]);

  // Toggle action type visibility
  const toggleActionType = (actionType: string) => {
    setActiveActionTypes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(actionType)) {
        newSet.delete(actionType);
      } else {
        newSet.add(actionType);
      }
      return newSet;
    });
  };

  // Transform data for the chart
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

  // Calculate action type statistics for active types (used in chart)
  const activeActionTypesWithStats = useMemo(() => {
    if (!currentPlayerData) return [];

    const totals = calculateActionTypeTotals(currentPlayerData, allActionTypes);

    // Filter to active action types and calculate percentages
    const activeTotals = Object.entries(totals)
      .filter(([actionType]) => activeActionTypes.has(actionType))
      .map(([actionType, total]) => ({ actionType, total }));

    const totalActions = activeTotals.reduce((sum, stat) => sum + stat.total, 0);

    return activeTotals
      .map((stat) => ({
        ...stat,
        percentage: totalActions > 0 ? Math.round((stat.total / totalActions) * 100) : 0
      }))
      .sort((a, b) => b.total - a.total);
  }, [currentPlayerData, allActionTypes, activeActionTypes]);

  // Calculate action type statistics for all types (used in legend)
  const allActionTypesWithStats = useMemo(() => {
    if (!currentPlayerData) return [];

    const totals = calculateActionTypeTotals(currentPlayerData, allActionTypes);

    // Include all action types
    const allTotals = Object.entries(totals)
      .map(([actionType, total]) => ({ actionType, total }));

    // Calculate percentages only for active action types
    const activeTotals = allTotals.filter((stat) => activeActionTypes.has(stat.actionType));
    const totalActiveActions = activeTotals.reduce((sum, stat) => sum + stat.total, 0);

    return allTotals
      .map((stat) => ({
        ...stat,
        percentage: activeActionTypes.has(stat.actionType) && totalActiveActions > 0
          ? Math.round((stat.total / totalActiveActions) * 100)
          : null
      }))
      .sort((a, b) => b.total - a.total);
  }, [currentPlayerData, allActionTypes, activeActionTypes]);

  if (!playerIds.length) return null;

  return (
    <Box w="full">
      <ChartViewport dataPointCount={chartData.length}>
        <ChartArea
          chartData={chartData}
          activeActionTypesWithStats={activeActionTypesWithStats}
          actionTypeColorMap={actionTypeColorMap}
        />
      </ChartViewport>

      <ActionTypeLegend
        allActionTypesWithStats={allActionTypesWithStats}
        activeActionTypes={activeActionTypes}
        actionTypeColorMap={actionTypeColorMap}
        onToggleActionType={toggleActionType}
      />
    </Box>
  );
};
