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

// Action type colors - using distinct colors for different action types
const ACTION_COLORS = {
  MOVE: '#3182CE', // Blue
  ORDER: '#DD6B20', // Orange
  DE_QUEUE: '#38A169', // Green
  BUILD: '#E53E3E', // Red
  GATHER_POINT: '#805AD5', // Purple
  PATROL: '#D69E2E', // Yellow
  SPECIAL: '#D53F8C', // Pink
  STANCE: '#B794F4', // Light Purple
  UNGARRISON: '#2F855A', // Dark Green
  STOP: '#63B3ED', // Light Blue
  RESEARCH: '#F6AD55', // Light Orange
  SELL: '#90CDF4', // Light Blue-Grey
  DE_MULTI_GATHERPOINT: '#68D391', // Light Green
  BUY: '#FBB6CE', // Light Pink
  FORMATION: '#F6E05E', // Light Yellow
  WALL: '#CBD5E0', // Light Grey
  DE_ATTACK_MOVE: '#4A5568', // Dark Grey
  DELETE: '#A0AEC0', // Grey
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

    // Get all unique action types from the data
    const actionTypes = new Set<string>();
    playerData.forEach((minuteData) => {
      Object.keys(minuteData).forEach((key) => {
        if (key !== 'minute' && typeof minuteData[key] === 'number') {
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

  const actionTypes = useMemo(() => {
    if (!selectedPlayerId || !apm?.players?.[selectedPlayerId]) {
      return [];
    }

    const playerData = apm.players[selectedPlayerId];
    if (!Array.isArray(playerData)) return [];

    const types = new Set<string>();
    playerData.forEach((minuteData) => {
      Object.keys(minuteData).forEach((key) => {
        if (key !== 'minute' && typeof minuteData[key] === 'number') {
          types.add(key);
        }
      });
    });

    // Sort action types by total count (descending)
    const actionTotals = Array.from(types).map((actionType) => {
      const total = playerData.reduce((sum, minuteData) => {
        return sum + (minuteData[actionType] || 0);
      }, 0);
      return { actionType, total };
    });

    return actionTotals
      .sort((a, b) => b.total - a.total)
      .map((item) => item.actionType);
  }, [apm, selectedPlayerId]);

  const containerH = useBreakpointValue({ base: '500px', md: '400px' });
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
            <Tooltip content={<CustomTooltip />} wrapperStyle={{ fontFamily: 'inherit' }} />
            <Legend
              verticalAlign="bottom"
              align="center"
              content={() => (
                <Box mt={2} px={2} overflow="visible" minH="40px">
                  <Flex wrap="wrap" justify="center" align="center" gap={1} w="100%">
                    {actionTypes.map((actionType) => (
                      <Flex
                        key={actionType}
                        align="center"
                        gap={1}
                        px={1}
                        py={0.5}
                        flexShrink={0}
                        minW="fit-content"
                      >
                        <Box
                          bg={ACTION_COLORS[actionType as keyof typeof ACTION_COLORS] || theme.colors.brand.zoolanderBlue}
                          w="12px"
                          h="12px"
                          borderRadius="sm"
                          flexShrink={0}
                        />
                        <Text
                          color={theme.colors.brand.midnightBlue}
                          fontSize="xs"
                          maxW="80px"
                          isTruncated
                          whiteSpace="nowrap"
                          flexShrink={0}
                        >
                          {actionType}
                        </Text>
                      </Flex>
                    ))}
                  </Flex>
                </Box>
              )}
            />
            {actionTypes.map((actionType) => (
              <Bar
                key={actionType}
                dataKey={actionType}
                stackId="a"
                fill={ACTION_COLORS[actionType as keyof typeof ACTION_COLORS] || theme.colors.brand.zoolanderBlue}
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