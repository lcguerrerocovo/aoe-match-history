import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Box, useTheme, Text, Flex, useBreakpointValue, useColorMode, Button, HStack } from '@chakra-ui/react';
import { PLAYER_COLORS } from './playerColors';

interface ApmActionData {
  minute: number;
  [actionType: string]: number;
}

interface ApmBreakdownChartProps {
  apm: {
    players: Record<string, ApmActionData[]>;
    averages?: Record<string, number>;
  };
  // Map profileId to display name for legend/tooltip labels
  nameByProfile?: Record<string, string | undefined>;
  // Map profileId to player color id for consistent stroke colors
  colorByProfile?: Record<string, number | undefined>;
}

// Action type colors - using more distinguishable colors
const ACTION_COLORS = {
  MOVE: '#1f77b4', // Distinct blue
  ORDER: '#ff7f0e', // Distinct orange
  DE_QUEUE: '#2ca02c', // Distinct green
  BUILD: '#d62728', // Distinct red
  GATHER_POINT: '#9467bd', // Distinct purple
  PATROL: '#8c564b', // Distinct brown
  SPECIAL: '#e377c2', // Distinct pink
  STANCE: '#7f7f7f', // Distinct gray
  UNGARRISON: '#bcbd22', // Distinct olive
  STOP: '#17becf', // Distinct cyan
  RESEARCH: '#ff9896', // Light red
  SELL: '#98df8a', // Light green
  DE_MULTI_GATHERPOINT: '#ffbb78', // Light orange
  BUY: '#c5b0d5', // Light purple
  FORMATION: '#c49c94', // Light brown
  WALL: '#f7b6d2', // Light pink
  DE_ATTACK_MOVE: '#dbdb8d', // Light yellow
  DELETE: '#9edae5', // Light cyan
};

export const ApmBreakdownChart: React.FC<ApmBreakdownChartProps> = ({ 
  apm, 
  nameByProfile = {}, 
  colorByProfile = {} 
}) => {
  const theme = useTheme();
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';

  const playerIds = Object.keys(apm?.players ?? {});
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(playerIds[0] || '');

  // Update selected player when playerIds change
  React.useEffect(() => {
    if (playerIds.length > 0 && !playerIds.includes(selectedPlayerId)) {
      setSelectedPlayerId(playerIds[0]);
    }
  }, [playerIds, selectedPlayerId]);

  const chartData = useMemo(() => {
    if (!selectedPlayerId || !apm?.players?.[selectedPlayerId]) {
      return [];
    }

    const playerData = apm.players[selectedPlayerId];
    if (!Array.isArray(playerData)) return [];

    // Debug: Log the first minute data to see structure
    if (playerData.length > 0) {
      console.log('First minute data structure:', playerData[0]);
    }

    // Get all unique action types from the data
    const actionTypes = new Set<string>();
    playerData.forEach((minuteData) => {
      Object.keys(minuteData).forEach((key) => {
        if (key !== 'minute' && key !== 'total' && typeof minuteData[key] === 'number') {
          actionTypes.add(key);
        }
      });
    });

    // Transform data for the chart
    return playerData.map((minuteData) => {
      const transformed: any = { minute: minuteData.minute };
      actionTypes.forEach((actionType) => {
        transformed[actionType] = minuteData[actionType] || 0;
      });
      return transformed;
    });
  }, [apm, selectedPlayerId]);

  const actionTypesWithStats = useMemo(() => {
    if (!selectedPlayerId || !apm?.players?.[selectedPlayerId]) {
      return [];
    }

    const playerData = apm.players[selectedPlayerId];
    if (!Array.isArray(playerData)) return [];

    const types = new Set<string>();
    playerData.forEach((minuteData) => {
      Object.keys(minuteData).forEach((key) => {
        if (key !== 'minute' && key !== 'total' && typeof minuteData[key] === 'number') {
          types.add(key);
        }
      });
    });

    // Calculate totals and percentages
    const actionStats = Array.from(types).map((actionType) => {
      const total = playerData.reduce((sum, minuteData) => {
        return sum + (minuteData[actionType] || 0);
      }, 0);
      return { actionType, total };
    });

    // Calculate total actions for percentage - use the sum of all action types
    const totalActions = actionStats.reduce((sum, stat) => sum + stat.total, 0);

    // Add percentage and sort by total count (descending)
    const result = actionStats
      .map((stat) => ({
        ...stat,
        percentage: totalActions > 0 ? Math.round((stat.total / totalActions) * 100) : 0
      }))
      .sort((a, b) => b.total - a.total);

    // Debug: Log action stats
    console.log('Action stats:', result);
    console.log('Total actions calculated:', totalActions);

    // Check if there's a total field to compare against
    const totalFromData = playerData.reduce((sum, minuteData) => {
      return sum + (minuteData.total || 0);
    }, 0);
    console.log('Total from data field:', totalFromData);

    return result;
  }, [apm, selectedPlayerId]);

  const containerH = useBreakpointValue({ base: '600px', md: '500px' });
  const showAxisLabel = useBreakpointValue({ base: false, md: true });

  if (!playerIds.length) return null;

  // Custom tooltip for stacked bar chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const totalActions = payload.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0);

    return (
      <Box 
        bg={theme.colors.brand.parchment} 
        border="1px solid" 
        borderColor={theme.colors.brand.slateBorder} 
        p={2} 
        borderRadius="md" 
        fontSize="sm" 
        minW="200px"

      >
        <Text fontWeight="bold" mb={1} color={theme.colors.brand.midnightBlue}>
          Minute {label}
        </Text>
        <Text fontSize="xs" color={theme.colors.brand.midnightBlue} mb={1}>
          Total: {totalActions} actions
        </Text>
        {payload.map((entry: any) => (
          <Flex key={entry.dataKey} align="center" justify="space-between" mb={0.5} gap={2}>
            <Text color={theme.colors.brand.midnightBlue} fontSize="xs">
              {entry.dataKey}
            </Text>
            <Box
              bg={entry.color}
              border="1px solid"
              borderColor="brand.steel"
              borderRadius="sm"
              w="32px"
              h="18px"
              display="flex"
              justifyContent="center"
              alignItems="center"
            >
              <Text fontSize="xs" fontWeight="bold" color="white">
                {entry.value}
              </Text>
            </Box>
          </Flex>
        ))}
      </Box>
    );
  };

  const selectedPlayerName = nameByProfile[selectedPlayerId] || selectedPlayerId;
  const selectedPlayerColor = colorByProfile[selectedPlayerId];
  const playerColor = selectedPlayerColor ? 
    PLAYER_COLORS[selectedPlayerColor] || theme.colors.brand.zoolanderBlue : 
    theme.colors.brand.zoolanderBlue;

  return (
    <Box w="full">
      {/* Player Selection */}
      <Flex 
        justify="center" 
        mb={4} 
        wrap="wrap" 
        gap={2}
        px={2}
      >
        {playerIds.map((pid) => {
          const name = nameByProfile[pid] || pid;
          const isSelected = pid === selectedPlayerId;
          const colorId = colorByProfile[pid];
          const playerColor = colorId ? 
            PLAYER_COLORS[colorId] || theme.colors.brand.zoolanderBlue : 
            theme.colors.brand.zoolanderBlue;

          return (
            <Button
              key={pid}
              size="sm"
              variant={isSelected ? "solid" : "outline"}
              colorScheme="brand"
              bg={isSelected ? playerColor : "transparent"}
              color={isSelected ? "white" : theme.colors.brand.midnightBlue}
              borderColor={playerColor}
              _hover={{
                bg: isSelected ? playerColor : playerColor,
                color: "white",
              }}
              onClick={() => setSelectedPlayerId(pid)}
              maxW="150px"
              isTruncated
            >
              {name}
            </Button>
          );
        })}
      </Flex>

      {/* Chart */}
      <Box h={containerH}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={chartData} 
            margin={{ 
              top: 5, 
              right: 0, 
              bottom: showAxisLabel ? 45 : 20, 
              left: showAxisLabel ? 0 : -20 
            }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={theme.colors.brand.steel}
              fill={isDark ? 'transparent' : theme.colors.brand.stoneLight}
            />
            <XAxis
              dataKey="minute"
              stroke={theme.colors.brand.midnightBlue}
              label={showAxisLabel ? {
                value: 'Minute',
                position: 'insideBottom',
                offset: -5,
                fill: theme.colors.brand.midnightBlue,
                fontWeight: 'bold',
              } : undefined}
            />
            <YAxis
              stroke={theme.colors.brand.midnightBlue}
              label={showAxisLabel ? {
                value: 'Actions',
                angle: -90,
                position: 'insideLeft',
                offset: 10,
                fill: theme.colors.brand.midnightBlue,
                fontWeight: 'bold',
              } : undefined}
            />
            <Tooltip 
              content={<CustomTooltip />} 
              wrapperStyle={{ fontFamily: 'inherit' }}
              offset={30}
            />
            <Legend
              verticalAlign="bottom"
              align="center"
              content={() => (
                <Box mt={2} px={2} overflow="visible" minH="60px">
                  <Flex wrap="wrap" justify="center" align="center" gap={2} w="100%">
                    {actionTypesWithStats.map((actionStat) => (
                      <Flex
                        key={actionStat.actionType}
                        align="center"
                        gap={2}
                        px={2}
                        py={1}
                        flexShrink={0}
                        minW="fit-content"
                        bg={theme.colors.brand.stoneLight}
                        borderRadius="md"
                        border="1px solid"
                        borderColor={theme.colors.brand.slateBorder}
                      >
                        <Box
                          bg={ACTION_COLORS[actionStat.actionType as keyof typeof ACTION_COLORS] || theme.colors.brand.zoolanderBlue}
                          w="16px"
                          h="16px"
                          borderRadius="sm"
                          flexShrink={0}
                        />
                        <Text
                          color={theme.colors.brand.midnightBlue}
                          fontSize="sm"
                          fontWeight="semibold"
                          maxW="140px"
                          isTruncated
                          whiteSpace="nowrap"
                          flexShrink={0}
                        >
                          {actionStat.actionType}
                        </Text>
                        <Text
                          color={theme.colors.brand.midnightBlue}
                          fontSize="xs"
                          fontWeight="bold"
                          flexShrink={0}
                        >
                          {actionStat.percentage}%
                        </Text>
                      </Flex>
                    ))}
                  </Flex>
                </Box>
              )}
            />
            {actionTypesWithStats.map((actionStat) => (
              <Bar
                key={actionStat.actionType}
                dataKey={actionStat.actionType}
                stackId="a"
                fill={ACTION_COLORS[actionStat.actionType as keyof typeof ACTION_COLORS] || theme.colors.brand.zoolanderBlue}
                stroke={theme.colors.brand.steel}
                strokeWidth={1}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
}; 