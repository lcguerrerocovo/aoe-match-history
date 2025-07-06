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

  const containerH = useBreakpointValue({ base: '500px', md: '400px' });
  const showAxisLabel = useBreakpointValue({ base: false, md: true });

  const playerIds = Object.keys(apm?.players ?? {});
  const visibleIds = activePids ?? playerIds;

  // Average APM per player
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

    return (
      <Box bg={theme.colors.brand.parchment} border="1px solid" borderColor={theme.colors.brand.slateBorder} p={2} borderRadius="md" fontSize="sm" minW="170px">
        <Text fontWeight="bold" mb={1} color={theme.colors.brand.midnightBlue}>Minute {label}</Text>
        {payload.map((entry: any) => {
          const name = nameByProfile[entry.dataKey] ?? entry.dataKey;
          const strokeColor = entry.color as string;
          const isLightBg = computeIsLight(strokeColor);
          const textColor = isLightBg
            ? (isDark ? theme.colors.brand.parchment : theme.colors.brand.midnightBlue)
            : (isDark ? theme.colors.brand.midnightBlue : theme.colors.brand.parchment);
          const textShadow = !isLightBg && !isDark ? '1px 1px 2px rgba(0,0,0,0.8)' : 'none';
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
          <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.brand.steel} />
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
                <Flex wrap="wrap" justify={{ base: 'flex-start', md: 'center' }} align="center" mt={2}>
                  {playerIds.map((pid) => {
                    const name = nameByProfile[pid] ?? pid;
                    const avg = averages[pid];
                    const colorId = colorByProfile[pid];
                    const strokeColor = colorId ? PLAYER_COLORS[colorId] || theme.colors.brand.zoolanderBlue : theme.colors.brand.zoolanderBlue;
                    const textColor = computeIsLight(strokeColor)
                      ? (isDark ? theme.colors.brand.parchment : theme.colors.brand.midnightBlue)
                      : (isDark ? theme.colors.brand.midnightBlue : theme.colors.brand.parchment);
                    const inactive = !visibleIds.includes(pid);
                    return (
                      <Flex key={pid} align="center" gap={1} mx={2} my={1} opacity={inactive ? 0.4 : 1} cursor="pointer" onClick={() => onToggle?.(pid)} w={{ base: '100%', md: 'auto' }}>
                        <Text color={theme.colors.brand.midnightBlue}>{name}</Text>
                        {avg !== undefined && (
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
                          >
                            <Text fontSize="xs" fontWeight="bold" color={textColor}>{avg}</Text>
                          </Box>
                        )}
                      </Flex>
                    );
                  })}
                </Flex>
              );
            }}
          />
          {playerIds.map((pid) => {
            const colorId = colorByProfile[pid];
            const stroke = colorId ? PLAYER_COLORS[colorId] || theme.colors.brand.zoolanderBlue : theme.colors.brand.zoolanderBlue;
            if (!visibleIds.includes(pid)) return null;
            return (
              <Line
                key={pid}
                type="monotone"
                dataKey={pid}
                stroke={stroke}
                dot={false}
                strokeWidth={2}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}; 