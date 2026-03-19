import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import type { TooltipProps } from 'recharts';
import { Box, Text, Flex, useBreakpointValue, Button } from '@chakra-ui/react';
import { useThemeMode } from '../theme/ThemeProvider';
import { PLAYER_COLORS } from '../utils/playerColors';

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

// Resolved color values for non-Chakra (Recharts SVG) usage.
// UI entries (inkDark, inkMuted, borderWarm, etc.) must match theme.ts.
// chartFallback uses a vibrant blue for chart line visibility when no
// player color is available — distinct from theme's brand.inkAccent.
const colors = {
  inkDark: { light: '#3B2614', dark: '#F7FAFC' },
  inkMuted: { light: '#8B7355', dark: '#CBD5E0' },
  stoneLight: { light: '#F2F0EA', dark: '#1A202C' },
  parchment: { light: '#F8F3E6', dark: '#1A1A1A' },
  inkLight: { light: '#C4B59A', dark: '#2D3748' },
  borderWarm: { light: '#9C8567', dark: '#4A5568' },
  chartFallback: { light: '#1E4BB8', dark: '#90CDF4' },
  bronzeDark: { light: '#6B4423', dark: '#6B4423' },
  darkWin: { light: '#2E7D32', dark: '#48BB78' },
  bronze: { light: '#B37A3E', dark: '#CD7F32' },
};

const c = (token: keyof typeof colors, isDark: boolean) => isDark ? colors[token].dark : colors[token].light;

export const ApmChart: React.FC<ApmChartProps> = ({ apm, colorByProfile = {}, nameByProfile = {}, activePids, onToggle }) => {
  const { isDark } = useThemeMode();



  const data = useMemo(() => {
    const players = apm?.players ?? {};
    // Determine max minute value
    let maxMinute = 0;
    Object.values(players).forEach((series) => {
      const last = series[series.length - 1];
      if (last && last.minute > maxMinute) maxMinute = last.minute;
    });

    // Build combined data rows from 0..maxMinute
    const rows: Record<string, number | string>[] = [];
    for (let m = 0; m <= maxMinute; m++) {
      const row: Record<string, number | string> = { minute: m };
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

  // Fixed height for chart area - will be matched by breakdown chart
  const chartAreaHeight = useBreakpointValue({ base: '550px', md: '500px' });
  const showAxisLabel = useBreakpointValue({ base: false, md: true });

  // Viewport configuration for horizontal scrolling (same as breakdown chart)
  const minBarWidth = 20; // Minimum width per minute in pixels
  const chartWidth = Math.max(800, data.length * minBarWidth); // Minimum 800px, or minutes * minBarWidth

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
    });
    return avg;
  }, [apm]);

  // Sort playerIds by average APM descending for legend
  const sortedPlayerIds = React.useMemo(() => {
    return [...playerIds].sort((a, b) => (averages[b] ?? 0) - (averages[a] ?? 0));
  }, [playerIds, averages]);

  if (!playerIds.length) return null;

  // Custom tooltip separates alias (uniform blue) and metric (stroke color)
  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (!active || !payload || !payload.length) return null;

    // Sort payload by value (APM at this minute), highest first
    const sortedPayload = [...payload].sort((a, b) => ((b.value as number) ?? 0) - ((a.value as number) ?? 0));

    return (
      <Box bg="brand.parchment" border="1px solid" borderColor="brand.borderWarm" p={2} borderRadius="md" fontSize="sm" minW="170px">
        <Text fontWeight="bold" mb={1} color="brand.inkDark">Minute {label}</Text>
        {[...new Map(sortedPayload.map((entry) => [String(entry.dataKey), entry])).values()].map((entry) => {
          const key = String(entry.dataKey);
          const name = nameByProfile[key] ?? key;
          const strokeColor = entry.color as string;
          return (
            <Flex key={entry.dataKey} align="center" justify="space-between" mb={0.5} gap={2}>
              <Text color="brand.inkDark">{name}</Text>
              <Box
                bg={strokeColor}
                border="1px solid"
                borderColor="brand.inkMuted"
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
                  color="#fff"
                  style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}
                >
                  {entry.value}
                </Text>
              </Box>
            </Flex>
          );
        })}
      </Box>
    );
  };

  return (
    <Box w="full">
      {/* Chart Area - Fixed Height with Horizontal Scroll */}
      <Box h={chartAreaHeight} minH="500px" overflowX="auto" overflowY="hidden" data-testid="chart-container">
        <Box minW={`${chartWidth}px`} h="100%">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 0, bottom: showAxisLabel ? 45 : 20, left: showAxisLabel ? 0 : -20 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={isDark ? c('inkMuted', isDark) : c('inkLight', false)}
            strokeOpacity={isDark ? 1 : 0.4}
            fill="transparent"
          />
          <XAxis
            dataKey="minute"
            stroke={c('inkDark', isDark)}
            label={showAxisLabel ? {
              value: 'Minute',
              position: 'insideBottom',
              offset: -5,
              fill: c('inkDark', isDark),
              fontWeight: 'bold',
            } : undefined}
          />
          <YAxis
            stroke={c('inkDark', isDark)}
            label={showAxisLabel ? {
              value: 'APM',
              angle: -90,
              position: 'insideLeft',
              offset: 10,
              fill: c('inkDark', isDark),
              fontWeight: 'bold',
            } : undefined}
          />
          <Tooltip content={<CustomTooltip />} wrapperStyle={{ fontFamily: 'inherit' }} />
          {playerIds.map((pid) => {
            const colorId = colorByProfile[pid];
            const stroke = colorId ? PLAYER_COLORS[colorId] || c('chartFallback', isDark) : c('chartFallback', isDark);
            if (!visibleIds.includes(pid)) return null;
            // Enhanced contrast for yellow, green, cyan, orange
            let isEnhanced = false;
            let outlineColor = c('inkMuted', isDark);
            if (colorId === 4 || stroke.toUpperCase() === '#FFFF00') { // yellow
              isEnhanced = true;
              outlineColor = c('bronzeDark', isDark);
            } else if (colorId === 3 || stroke.toUpperCase() === '#00FF00') { // green
              isEnhanced = true;
              outlineColor = c('darkWin', isDark);
            } else if (colorId === 5 || stroke.toUpperCase() === '#00FFFF') { // cyan
              isEnhanced = true;
              outlineColor = c('borderWarm', isDark);
            } else if (colorId === 8 || stroke.toUpperCase() === '#FFA500') { // orange
              isEnhanced = true;
              outlineColor = c('bronze', isDark);
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
      </Box>
      {/* Legend Area - Dynamic Height */}
      <Box mt={2}>
        <Flex
          wrap="wrap"
          justify={{ base: 'flex-start', md: 'center' }}
          align="center"
          gap={1}
          w="100%"
          minH="40px"
        >
          {sortedPlayerIds.map((pid) => {
            const name = nameByProfile[pid] ?? pid;
            const avg = averages[pid];
            const colorId = colorByProfile[pid];
            const playerColor = colorId ? PLAYER_COLORS[colorId] || c('chartFallback', isDark) : c('chartFallback', isDark);
            const inactive = !visibleIds.includes(pid);

            return (
              <Button
                key={pid}
                size="sm"
                variant="outline"
                colorPalette="brand"
                bg={inactive ? (isDark ? 'transparent' : 'brand.stoneLight') : 'brand.parchmentDark'}
                color={isDark ? 'brand.parchment' : 'brand.inkDark'}
                borderColor={inactive ? 'brand.borderWarm' : (isDark ? 'brand.parchment' : 'brand.inkDark')}
                _hover={{
                  bg: 'brand.parchmentDark',
                }}
                onClick={() => onToggle?.(pid)}
                maxW="200px"
                h="auto"
                py={1.5}
                px={2}
                opacity={inactive ? 0.5 : 1}
              >
                <Flex align="center" justify="space-between" w="100%" gap={2}>
                  <Flex align="center" gap={2}>
                    <Box
                      w="10px"
                      h="10px"
                      borderRadius="full"
                      bg={playerColor}
                      border="1px solid"
                      borderColor="brand.borderWarm"
                      flexShrink={0}
                    />
                    <Text
                      fontSize="xs"
                      fontWeight={inactive ? 'medium' : 'bold'}
                      flexShrink={0}
                      maxW="100px"
                      truncate
                      color={isDark ? 'brand.parchment' : 'brand.inkDark'}
                    >
                      {name}
                    </Text>
                  </Flex>
                  {avg !== undefined && avg !== null && (
                    <Box
                      bg="brand.stoneLight"
                      border="1px solid"
                      borderColor="brand.borderWarm"
                      borderRadius="sm"
                      px={1.5}
                      py={0.5}
                      flexShrink={0}
                    >
                      <Text
                        fontSize="xs"
                        fontWeight="bold"
                        color="brand.inkDark"
                      >
                        {avg}
                      </Text>
                    </Box>
                  )}
                </Flex>
              </Button>
            );
          })}
        </Flex>
      </Box>
    </Box>
  );
};
