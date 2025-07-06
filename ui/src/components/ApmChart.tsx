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
import { Box, useTheme, Text, Flex } from '@chakra-ui/react';
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
}

export const ApmChart: React.FC<ApmChartProps> = ({ apm, colorByProfile = {}, nameByProfile = {} }) => {
  const theme = useTheme();

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

  const playerIds = Object.keys(apm?.players ?? {});

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
          const textColor = isLightBg ? theme.colors.brand.midnightBlue : theme.colors.brand.parchment;
          const textShadow = !isLightBg ? '1px 1px 2px rgba(0,0,0,0.8)' : 'none';
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
    <Box w="full" h={{ base: '260px', md: '400px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 45, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.brand.steel} />
          <XAxis
            dataKey="minute"
            stroke={theme.colors.brand.midnightBlue}
            label={{
              value: 'Minute',
              position: 'insideBottom',
              offset: -10,
              fill: theme.colors.brand.midnightBlue,
              fontWeight: 'bold',
            }}
          />
          <YAxis
            stroke={theme.colors.brand.midnightBlue}
            label={{
              value: 'APM',
              angle: -90,
              position: 'insideLeft',
              offset: 10,
              fill: theme.colors.brand.midnightBlue,
              fontWeight: 'bold',
            }}
          />
          <Tooltip content={<CustomTooltip />} wrapperStyle={{ fontFamily: 'inherit' }} />
          <Legend
            wrapperStyle= {{ bottom: 25}}
            verticalAlign="bottom"
            align="center"
            content={(props) => {
              const { payload } = props as any;
              if (!payload) return null;

              const computeIsLight = (hex: string) => {
                const cleaned = hex.replace('#', '');
                if (cleaned.length !== 6) return false;
                const r = parseInt(cleaned.substr(0, 2), 16);
                const g = parseInt(cleaned.substr(2, 2), 16);
                const b = parseInt(cleaned.substr(4, 2), 16);
                return (0.299 * r + 0.587 * g + 0.114 * b) > 130;
              };

              return (
                <Flex wrap="wrap" justify="center" align="center" mt={2}>
                  {payload.map((entry: any) => {
                    const pid = entry.value as string;
                    const name = nameByProfile[pid] ?? pid;
                    const avg = averages[pid];
                    const strokeColor = entry.color as string;
                    const isLightBg = computeIsLight(strokeColor);
                    const textColor = isLightBg ? theme.colors.brand.midnightBlue : theme.colors.brand.parchment;
                    const textShadow = !isLightBg ? '1px 1px 2px rgba(0,0,0,0.8)' : 'none';
                    return (
                      <Flex key={pid} align="center" gap={1} mx={2} my={1}>
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
                            px={2.5}
                            py={0.5}
                            display="flex"
                            justifyContent="center"
                            alignItems="center"
                          >
                            <Text fontSize="xs" fontWeight="bold" color={textColor} style={{ textShadow }}>{avg}</Text>
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