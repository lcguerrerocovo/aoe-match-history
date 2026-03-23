import React, { useMemo, useState } from 'react';
import { Box } from '@chakra-ui/react';
import { extractActionTypes, calculateActionTypeTotals } from './utils';
import { PlayerSelector } from './PlayerSelector';
import { ChartArea } from './ChartArea';
import { ActionTypeLegend } from './ActionTypeLegend';

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
}

export const ApmBreakdownChart: React.FC<ApmBreakdownChartProps> = ({
  apm,
  nameByProfile = {},
  colorByProfile = {}
}) => {
  const playerIds = Object.keys(apm?.players ?? {});
  // Default to player with the most data entries (longest game participation)
  const defaultPlayerId = useMemo(() => {
    if (!playerIds.length) return '';
    return playerIds.reduce((best, pid) => {
      const bestLen = apm?.players?.[best]?.length ?? 0;
      const curLen = apm?.players?.[pid]?.length ?? 0;
      return curLen > bestLen ? pid : best;
    }, playerIds[0]);
  }, [playerIds, apm]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(defaultPlayerId);
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

  // Update selected player when playerIds change
  React.useEffect(() => {
    if (playerIds.length > 0 && !playerIds.includes(selectedPlayerId)) {
      setSelectedPlayerId(defaultPlayerId);
    }
  }, [playerIds, selectedPlayerId, defaultPlayerId]);

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

  // Calculate average APM for each player
  const playerAverages = useMemo(() => {
    const averages: Record<string, number> = {};

    playerIds.forEach((pid) => {
      const playerData = apm?.players?.[pid];
      if (!Array.isArray(playerData) || playerData.length === 0) {
        averages[pid] = 0;
        return;
      }

      const sum = playerData.reduce((acc, pt) => {
        if (activeActionTypes.size > 0) {
          return acc + Object.entries(pt).reduce((a, [k, v]) => {
            if (k !== 'minute' && k !== 'total' && typeof v === 'number' && activeActionTypes.has(k)) {
              return a + v;
            }
            return a;
          }, 0);
        } else {
          const val = typeof pt.total === 'number'
            ? pt.total
            : Object.entries(pt).reduce((a, [k, v]) => (k !== 'minute' && k !== 'total' && typeof v === 'number' ? a + v : a), 0);
          return acc + val;
        }
      }, 0);

      averages[pid] = Math.round(sum / playerData.length);
    });

    return averages;
  }, [playerIds, apm, activeActionTypes]);

  // Sort player IDs by average APM (descending)
  const sortedPlayerIds = useMemo(() => {
    return [...playerIds].sort((a, b) => {
      const avgA = playerAverages[a] || 0;
      const avgB = playerAverages[b] || 0;
      return avgB - avgA;
    });
  }, [playerIds, playerAverages]);

  if (!playerIds.length) return null;

  return (
    <Box w="full">
      <PlayerSelector
        sortedPlayerIds={sortedPlayerIds}
        selectedPlayerId={selectedPlayerId}
        onSelectPlayer={setSelectedPlayerId}
        nameByProfile={nameByProfile}
        colorByProfile={colorByProfile}
        playerAverages={playerAverages}
      />

      <ChartArea
        chartData={chartData}
        activeActionTypesWithStats={activeActionTypesWithStats}
        actionTypeColorMap={actionTypeColorMap}
      />

      <ActionTypeLegend
        allActionTypesWithStats={allActionTypesWithStats}
        activeActionTypes={activeActionTypes}
        actionTypeColorMap={actionTypeColorMap}
        onToggleActionType={toggleActionType}
      />
    </Box>
  );
};
