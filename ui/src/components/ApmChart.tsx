import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Box, useTheme, Text, Flex, useBreakpointValue, useColorMode } from '@chakra-ui/react';
import { PLAYER_COLORS } from './playerColors';

interface ApmPlayerSeries {
  minute: number;
  total: number;
}

interface ApmData {
  [profileId: string]: ApmPlayerSeries[];
}

interface ApmChartProps {
  apm: {
    players: ApmData;
    averages?: Record<string, number>;
  };
  // Map profileId to player color id for consistent stroke colors
  colorByProfile?: Record<string, number | undefined>;
  // Map profileId to display name for legend/tooltip labels
  nameByProfile?: Record<string, string | undefined>;
  // Currently active (visible) profileIds
  activePids?: string[];
  // Toggle callback when legend entry clicked
  onToggle?: (pid: string) => void;
}

export const ApmChart: React.FC<ApmChartProps> = ({ apm, colorByProfile = {}, nameByProfile = {}, activePids, onToggle }) => {
  const theme = useTheme();
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';

  const data = useMemo(() => {
    const players = apm?.players ?? {};
    // Determine max minute value
    let maxMinute = 0;
    Object.values(players).forEach((series) => {
      const last = series[series.length - 1];
      if (last && last.minute > maxMinute) maxMinute = last.minute;
    });

    // Build combined data rows from 0..maxMinute
    const rows: Record<string, any>[] = [];
    for (let m = 0; m <= maxMinute; m++) {
      const row: Record<string, any> = { minute: m };
      Object.entries(players).forEach(([pid, series]) => {
        const point = series.find((s) => s.minute === m);
        if (point) {
          const totalVal = typeof point.total === 'number'
            ? point.total
            : Object.entries(point).reduce((acc, [k, v]) => (k !== 'minute' && k !== 'total' && typeof v === 'number' ? acc + v : acc), 0);
          row[pid] = totalVal;
        } else {
          row[pid] = 0;
        }
      });
      rows.push(row);
    }
    return rows;
  }, [apm]);

  const containerH = useBreakpointValue({ base: '600px', md: '500px' });
  const showAxisLabel = useBreakpointValue({ base: false, md: true });

  const playerIds = Object.keys(apm?.players ?? {});
  const visibleIds = activePids ?? playerIds;

  // Average APM per player (always calculate our own)
  const averages = React.useMemo(() => {
    const avg: Record<string, number> = {};
    Object.entries(apm?.players ?? {}).forEach(([pid, series]) => {
      if (!Array.isArray(series) || !series.length) return;
      const sum = series.reduce((acc, pt) => {
        const val = typeof pt.total === 'number'
          ? pt.total
          : Object.entries(pt).reduce((a, [k, v]) => (k !== 'minute' && k !== 'total' && typeof v === 'number' ? a + v : a), 0);
        return acc + val;
      }, 0);
      avg[pid] = Math.round(sum / series.length);
      
      // Debug: Log the calculation for comparison
      console.log('ApmChart - Player:', pid);
      console.log('ApmChart - Total sum:', sum);
      console.log('ApmChart - Series length:', series.length);
      console.log('ApmChart - Calculated average:', avg[pid]);
    });
    return avg;
  }, [apm]);

  // Sort playerIds by average APM descending for legend
  const sortedPlayerIds = React.useMemo(() => {
    return [...playerIds].sort((a, b) => (averages[b] ?? 0) - (averages[a] ?? 0));
  }, [playerIds, averages]);

  if (!playerIds.length) return null;

  // Custom tooltip separates alias (uniform blue) and metric (stroke color)
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const computeIsLight = (hex: string) => {
      const cleaned = hex.replace('#', '');
      if (cleaned.length !== 6) return false;
      const r = parseInt(cleaned.substr(0, 2), 16);
      const g = parseInt(cleaned.substr(2, 2), 16);
      const b = parseInt(cleaned.substr(4, 2), 16);
      return (0.299 * r + 0.587 * g + 0.114 * b) > 130;
    };

    // Sort payload by value (APM at this minute), highest first
    const sortedPayload = [...payload].sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

    return (
      <Box bg={theme.colors.brand.parchment} border="1px solid" borderColor={theme.colors.brand.slateBorder} p={2} borderRadius="md" fontSize="sm" minW="170px">
        <Text fontWeight="bold" mb={1} color={theme.colors.brand.midnightBlue}>Minute {label}</Text>
        {[...new Map(sortedPayload.map((entry: any) => [entry.dataKey, entry])).values()].map((entry: any) => {
          const name = nameByProfile[entry.dataKey] ?? entry.dataKey;
          const strokeColor = entry.color as string;
          const isLightBg = computeIsLight(strokeColor);
          const textColor = isDark ? theme.colors.brand.white : (isLightBg ? theme.colors.brand.pureBlack : theme.colors.brand.white);
          const needsShadow = !isDark && (entry.dataKey === '4' || entry.dataKey === '5' || isLightBg);
          const textShadow = needsShadow ? '0 1px 1.5px rgba(0,0,0,0.18)' : 'none';
          return (
            <Flex key={entry.dataKey} align="center" justify="space-between" mb={0.5} gap={2}>
              <Text color={theme.colors.brand.midnightBlue}>{name}</Text>
              <Box
                bg={strokeColor}
                border="1px solid"
                borderColor="brand.steel"
                borderRadius="sm"
                w="32px"
                h="18px"
                display="flex"
                justifyContent="center"
                alignItems="center"
              >
                <Text fontSize="xs" fontWeight="bold" color={textColor} style={{ textShadow }}>{entry.value}</Text>
              </Box>
            </Flex>
          );
        })}
      </Box>
    );
  };

  return (
    <Box w="full" h={containerH}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 0, bottom: showAxisLabel ? 45 : 20, left: showAxisLabel ? 0 : -20 }}>
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
              value: 'APM',
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
            content={() => {
              const computeIsLight = (hex: string) => {
                const cleaned = hex.replace('#', '');
                if (cleaned.length !== 6) return false;
                const r = parseInt(cleaned.substr(0, 2), 16);
                const g = parseInt(cleaned.substr(2, 2), 16);
                const b = parseInt(cleaned.substr(4, 2), 16);
                return (0.299 * r + 0.587 * g + 0.114 * b) > 130;
              };

              return (
                <Box
                  mt={2}
                  px={2}
                  overflow="visible"
                  minH="40px"
                >
                  <Flex
                    wrap="wrap"
                    justify={{ base: 'flex-start', md: 'center' }}
                    align="center"
                    gap={1}
                    w="100%"
                  >
                    {sortedPlayerIds.map((pid) => {
                      const name = nameByProfile[pid] ?? pid;
                      const avg = averages[pid];
                      const colorId = colorByProfile[pid];
                      const strokeColor = colorId ? PLAYER_COLORS[colorId] || theme.colors.brand.zoolanderBlue : theme.colors.brand.zoolanderBlue;
                      const isLightBg = computeIsLight(strokeColor);
                      const textColor = isDark ? theme.colors.brand.white : (isLightBg ? theme.colors.brand.pureBlack : theme.colors.brand.white);
                      const needsShadow = !isDark && (colorId === 4 || colorId === 5 || isLightBg);
                      const textShadow = needsShadow ? '0 1px 1.5px rgba(0,0,0,0.18)' : 'none';
                      const inactive = !visibleIds.includes(pid);
                      return (
                        <Flex
                          key={pid}
                          align="center"
                          gap={1}
                          px={1}
                          py={0.5}
                          opacity={inactive ? 0.4 : 1}
                          cursor="pointer"
                          onClick={() => onToggle?.(pid)}
                          flexShrink={0}
                          minW="fit-content"
                        >
                          <Text
                            color={theme.colors.brand.midnightBlue}
                            fontSize="xs"
                            maxW="80px"
                            isTruncated
                            whiteSpace="nowrap"
                            flexShrink={0}
                          >
                            {name}
                          </Text>
                          {avg !== undefined && avg !== null && (
                            <Box
                              bg={strokeColor}
                              border="1px solid"
                              borderColor="brand.steel"
                              borderRadius="sm"
                              w="32px"
                              h="18px"
                              boxShadow="sm"
                              display="flex"
                              justifyContent="center"
                              alignItems="center"
                              flexShrink={0}
                            >
                              <Text fontSize="xs" fontWeight="bold" color={textColor} style={{ textShadow }}>{avg}</Text>
                            </Box>
                          )}
                        </Flex>
                      );
                    })}
                  </Flex>
                </Box>
              );
            }}
          />
          {playerIds.map((pid) => {
            const colorId = colorByProfile[pid];
            const stroke = colorId ? PLAYER_COLORS[colorId] || theme.colors.brand.zoolanderBlue : theme.colors.brand.zoolanderBlue;
            if (!visibleIds.includes(pid)) return null;
            // Enhanced contrast for yellow, green, cyan, orange
            let isEnhanced = false;
            let outlineColor = theme.colors.brand.steel;
            if (colorId === 4 || stroke.toUpperCase() === '#FFFF00') { // yellow
              isEnhanced = true;
              outlineColor = theme.colors.brand.bronzeDark;
            } else if (colorId === 3 || stroke.toUpperCase() === '#00FF00') { // green
              isEnhanced = true;
              outlineColor = theme.colors.brand.darkWin;
            } else if (colorId === 5 || stroke.toUpperCase() === '#00FFFF') { // cyan
              isEnhanced = true;
              outlineColor = theme.colors.brand.slateBorder;
            } else if (colorId === 8 || stroke.toUpperCase() === '#FFA500') { // orange
              isEnhanced = true;
              outlineColor = theme.colors.brand.bronze;
            }
            return isEnhanced ? (
              <React.Fragment key={pid}>
                <Line
                  type="monotone"
                  dataKey={pid}
                  stroke={outlineColor}
                  strokeWidth={3}
                  strokeOpacity={0.8}
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                  legendType="none"
                />
                <Line
                  type="monotone"
                  dataKey={pid}
                  stroke={stroke}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </React.Fragment>
            ) : (
              <Line
                key={pid}
                type="monotone"
                dataKey={pid}
                stroke={stroke}
                dot={false}
                strokeWidth={2}
                isAnimationActive={false}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}; 