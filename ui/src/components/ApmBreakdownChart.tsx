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

import { Box, useTheme, Text, Flex, useBreakpointValue, useColorMode, Button } from '@chakra-ui/react';
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

// Function to get color by index, cycling through the palette
const getColorByIndex = (index: number): string => {
  return COLOR_PALETTE[index % COLOR_PALETTE.length];
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
  const [activeActionTypes, setActiveActionTypes] = useState<Set<string>>(new Set());

  // Utility functions for color contrast and readability
  const hexToRgb = (hex: string): [number, number, number] => {
    const cleaned = hex.replace('#', '');
    const r = parseInt(cleaned.substr(0, 2), 16);
    const g = parseInt(cleaned.substr(2, 2), 16);
    const b = parseInt(cleaned.substr(4, 2), 16);
    return [r, g, b];
  };

  const getLuminance = (r: number, g: number, b: number): number => {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  const getContrastRatio = (color1: string, color2: string): number => {
    const [r1, g1, b1] = hexToRgb(color1);
    const [r2, g2, b2] = hexToRgb(color2);
    
    const lum1 = getLuminance(r1, g1, b1);
    const lum2 = getLuminance(r2, g2, b2);
    
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    
    return (brightest + 0.05) / (darkest + 0.05);
  };

  const getOptimalTextColor = (backgroundColor: string): string => {
    const whiteContrast = getContrastRatio(backgroundColor, '#FFFFFF');
    const blackContrast = getContrastRatio(backgroundColor, '#000000');
    
    // Always prefer the higher contrast option for better readability
    if (whiteContrast > blackContrast) {
      return theme.colors.brand.white;
    } else {
      return theme.colors.brand.pureBlack;
    }
  };

  const getTextShadow = (backgroundColor: string, textColor: string): string => {
    const contrast = getContrastRatio(backgroundColor, textColor);
    
    // More aggressive shadow application for better readability
    if (contrast < 8) { // Lowered threshold for more shadows
      const shadowColor = textColor === theme.colors.brand.white ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)';
      return `0 1px 3px ${shadowColor}`; // Stronger shadow
    }
    
    return 'none';
  };

  // Create a mapping of action types to color indices for consistent colors
  const actionTypeColorMap = useMemo(() => {
    const map: Record<string, number> = {};
    const allTypes = new Set<string>();
    
    // Collect all action types from all players
    Object.values(apm?.players ?? {}).forEach(playerData => {
      if (Array.isArray(playerData)) {
        playerData.forEach(minuteData => {
          Object.keys(minuteData).forEach(key => {
            if (key !== 'minute' && key !== 'total' && typeof minuteData[key] === 'number') {
              allTypes.add(key);
            }
          });
        });
      }
    });
    
    // Assign colors in order
    Array.from(allTypes).forEach((actionType, index) => {
      map[actionType] = index;
    });
    
    return map;
  }, [apm]);

  // Update selected player when playerIds change
  React.useEffect(() => {
    if (playerIds.length > 0 && !playerIds.includes(selectedPlayerId)) {
      setSelectedPlayerId(playerIds[0]);
    }
  }, [playerIds, selectedPlayerId]);

  // Initialize active action types when player changes
  React.useEffect(() => {
    if (!selectedPlayerId || !apm?.players?.[selectedPlayerId]) {
      setActiveActionTypes(new Set());
      return;
    }

    const playerData = apm.players[selectedPlayerId];
    if (!Array.isArray(playerData)) {
      setActiveActionTypes(new Set());
      return;
    }

    const types = new Set<string>();
    playerData.forEach((minuteData) => {
      Object.keys(minuteData).forEach((key) => {
        if (key !== 'minute' && key !== 'total' && typeof minuteData[key] === 'number') {
          types.add(key);
        }
      });
    });

    setActiveActionTypes(types);
  }, [selectedPlayerId, apm]);

  // Toggle action type visibility - this state is isolated from ApmChart
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
        if (key !== 'minute' && key !== 'total' && typeof minuteData[key] === 'number') {
          actionTypes.add(key);
        }
      });
    });

    // Transform data for the chart - only include active action types
    return playerData.map((minuteData) => {
      const transformed: any = { minute: minuteData.minute };
      actionTypes.forEach((actionType) => {
        if (activeActionTypes.has(actionType)) {
          transformed[actionType] = minuteData[actionType] || 0;
        }
      });
      return transformed;
    });
  }, [apm, selectedPlayerId, activeActionTypes]);

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

    // Calculate totals and percentages - only for active action types
    const actionStats = Array.from(types)
      .filter(actionType => activeActionTypes.has(actionType))
      .map((actionType) => {
        const total = playerData.reduce((sum, minuteData) => {
          return sum + (minuteData[actionType] || 0);
        }, 0);
        return { actionType, total };
      });

    // Calculate total actions for percentage - use the sum of active action types only
    const totalActions = actionStats.reduce((sum, stat) => sum + stat.total, 0);

    // Add percentage and sort by total count (descending)
    const result = actionStats
      .map((stat) => ({
        ...stat,
        percentage: totalActions > 0 ? Math.round((stat.total / totalActions) * 100) : 0
      }))
      .sort((a, b) => b.total - a.total);



    return result;
  }, [apm, selectedPlayerId, activeActionTypes]);

  const containerH = useBreakpointValue({ base: '600px', md: '500px' });
  const showAxisLabel = useBreakpointValue({ base: false, md: true });

  // Calculate average APM for each player
  const playerAverages = useMemo(() => {
    const averages: Record<string, number> = {};
    
    playerIds.forEach((pid) => {
      if (!apm?.players?.[pid]) {
        averages[pid] = 0;
        return;
      }

      const playerData = apm.players[pid];
      if (!Array.isArray(playerData) || playerData.length === 0) {
        averages[pid] = 0;
        return;
      }

      // Use the same calculation method as ApmChart
      const sum = playerData.reduce((acc, pt) => {
        // If we have active action types, sum only those
        if (activeActionTypes.size > 0) {
          return acc + Object.entries(pt).reduce((a, [k, v]) => {
            if (k !== 'minute' && k !== 'total' && typeof v === 'number' && activeActionTypes.has(k)) {
              return a + v;
            }
            return a;
          }, 0);
        } else {
          // If no active action types, use the same logic as ApmChart
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

  // Get all action types for legend display
  const allActionTypes = useMemo(() => {
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

    // Calculate totals for sorting
    const actionTotals = Array.from(types).map((actionType) => {
      const total = playerData.reduce((sum, minuteData) => {
        return sum + (minuteData[actionType] || 0);
      }, 0);
      return { actionType, total };
    });

    // Sort by total count (descending) - most actions first
    return actionTotals
      .sort((a, b) => b.total - a.total)
      .map((item) => item.actionType);
  }, [selectedPlayerId, apm]);

  // Sort player IDs by average APM (descending)
  const sortedPlayerIds = useMemo(() => {
    return [...playerIds].sort((a, b) => {
      const avgA = playerAverages[a] || 0;
      const avgB = playerAverages[b] || 0;
      return avgB - avgA; // Descending order (highest APM first)
    });
  }, [playerIds, playerAverages]);

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
              <Text 
                fontSize="xs" 
                fontWeight="bold" 
                color={getOptimalTextColor(entry.color)}
                style={{
                  textShadow: getTextShadow(entry.color, getOptimalTextColor(entry.color))
                }}
              >
                {entry.value}
              </Text>
            </Box>
          </Flex>
        ))}
      </Box>
    );
  };

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
        {sortedPlayerIds.map((pid) => {
          const name = nameByProfile[pid] || pid;
          const isSelected = pid === selectedPlayerId;
          const colorId = colorByProfile[pid];
          const playerColor = colorId ? 
            PLAYER_COLORS[colorId] || theme.colors.brand.zoolanderBlue : 
            theme.colors.brand.zoolanderBlue;

          const playerAvg = playerAverages[pid] || 0;
          
          return (
            <Button
              key={pid}
              size="sm"
              variant={isSelected ? "solid" : "outline"}
              colorScheme="brand"
              bg={isSelected ? playerColor : "transparent"}
              color={isSelected ? theme.colors.brand.white : theme.colors.brand.midnightBlue}
              borderColor={playerColor}
              _hover={{
                bg: isSelected ? playerColor : playerColor,
                color: theme.colors.brand.white,
              }}
              onClick={() => setSelectedPlayerId(pid)}
              maxW="200px"
              h="auto"
              py={2}
              px={3}
            >
              <Flex align="center" justify="space-between" w="100%" gap={2}>
                <Text 
                  fontSize="xs" 
                  fontWeight="semibold"
                  flexShrink={0}
                  maxW="120px"
                  isTruncated
                  color={isSelected ? getOptimalTextColor(playerColor) : theme.colors.brand.midnightBlue}
                  style={{
                    textShadow: isSelected ? getTextShadow(playerColor, getOptimalTextColor(playerColor)) : 'none'
                  }}
                >
                  {name}
                </Text>
                {isSelected && (
                  <Box
                    bg={theme.colors.brand.stoneLight}
                    border="1px solid"
                    borderColor={theme.colors.brand.slateBorder}
                    borderRadius="sm"
                    px={2}
                    py={1}
                    flexShrink={0}
                  >
                    <Text 
                      fontSize="xs" 
                      fontWeight="bold" 
                      color={getOptimalTextColor(theme.colors.brand.stoneLight)}
                      style={{
                        textShadow: getTextShadow(theme.colors.brand.stoneLight, getOptimalTextColor(theme.colors.brand.stoneLight))
                      }}
                    >
                      {playerAvg}
                    </Text>
                  </Box>
                )}
              </Flex>
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
              content={() => {
                

                return (
                  <Box mt={2} px={2} overflow="visible" minH="60px">
                    <Flex wrap="wrap" justify="center" align="center" gap={2} w="100%">
                      {allActionTypes.map((actionType) => {
                        const isActive = activeActionTypes.has(actionType);
                        const actionStat = actionTypesWithStats.find(stat => stat.actionType === actionType);
                        
                        return (
                          <Flex
                            key={actionType}
                            align="center"
                            gap={2}
                            px={2}
                            py={1}
                            flexShrink={0}
                            minW="fit-content"
                            bg={isActive ? theme.colors.brand.stoneLight : theme.colors.brand.fadedBlue}
                            borderRadius="md"
                            border="1px solid"
                            borderColor={isActive ? theme.colors.brand.slateBorder : theme.colors.brand.lightSteel}
                            opacity={isActive ? 1 : 0.6}
                            cursor="pointer"
                            onClick={() => toggleActionType(actionType)}
                            _hover={{
                              opacity: 1,
                              bg: theme.colors.brand.stoneLight,
                            }}
                          >
                            <Box
                              bg={getColorByIndex(actionTypeColorMap[actionType] || 0)}
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
                              {actionType}
                            </Text>
                            {actionStat && (
                              <Text
                                color={theme.colors.brand.midnightBlue}
                                fontSize="xs"
                                fontWeight="bold"
                                flexShrink={0}
                              >
                                {actionStat.percentage}%
                              </Text>
                            )}
                          </Flex>
                        );
                      })}
                    </Flex>
                  </Box>
                );
              }}
            />
            {actionTypesWithStats.map((actionStat) => (
              <Bar
                key={actionStat.actionType}
                dataKey={actionStat.actionType}
                stackId="a"
                fill={getColorByIndex(actionTypeColorMap[actionStat.actionType] || 0)}
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