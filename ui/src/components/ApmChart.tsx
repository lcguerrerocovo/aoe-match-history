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
import { Box, useTheme } from '@chakra-ui/react';
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
  // option to map profileId to player color id for consistent colors
  colorByProfile?: Record<string, number | undefined>;
}

export const ApmChart: React.FC<ApmChartProps> = ({ apm, colorByProfile = {} }) => {
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

  if (!playerIds.length) return null;

  return (
    <Box w="full" h={{ base: '200px', md: '300px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.brand.steel} />
          <XAxis dataKey="minute" stroke={theme.colors.brand.midnightBlue} />
          <YAxis stroke={theme.colors.brand.midnightBlue} />
          <Tooltip />
          <Legend />
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