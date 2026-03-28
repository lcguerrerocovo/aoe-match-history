import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import type { TooltipProps } from 'recharts';
import { Box, Text, Flex, useBreakpointValue } from '@chakra-ui/react';
import { useThemeMode } from '../../theme/ThemeProvider';
import { getColorByIndex } from './utils';

// Resolved color values for non-Chakra (Recharts SVG) usage.
// Must mirror the semantic tokens in theme.ts.
const colors = {
  inkDark: { light: '#3B2614', dark: '#F7FAFC' },
  inkSubtle: { light: '#C4B59A', dark: '#CBD5E0' },
};

const c = (token: keyof typeof colors, isDark: boolean) => isDark ? colors[token].dark : colors[token].light;

const TOOLTIP_TEXT_SHADOW = '0 1px 2px rgba(0,0,0,0.6)';

interface ActionTypeStat {
  actionType: string;
  total: number;
  percentage: number;
}

interface ChartAreaProps {
  chartData: Record<string, number | string>[];
  activeActionTypesWithStats: ActionTypeStat[];
  actionTypeColorMap: Record<string, number>;
}

export function ChartArea({ chartData, activeActionTypesWithStats, actionTypeColorMap }: ChartAreaProps) {
  const { isDark } = useThemeMode();
  const showAxisLabel = useBreakpointValue({ base: false, md: true });

  // Custom tooltip for stacked bar chart
  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (!active || !payload || !payload.length) return null;

    const totalActions = payload.reduce((sum, entry) => sum + ((entry.value as number) || 0), 0);

    return (
      <Box
        bg="brand.parchment"
        border="1px solid"
        borderColor="brand.borderWarm"
        p={2}
        borderRadius="md"
        fontSize="sm"
        minW="200px"
      >
        <Text fontWeight="bold" mb={1} color="brand.inkDark">
          Minute {label}
        </Text>
        <Text fontSize="xs" color="brand.inkDark" mb={1}>
          Total: {totalActions} actions
        </Text>
        {payload.map((entry) => (
          <Flex key={entry.dataKey} align="center" justify="space-between" mb={0.5} gap={2}>
            <Text color="brand.inkDark" fontSize="xs">
              {entry.dataKey}
            </Text>
            <Box
              bg={entry.color}
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
                style={{
                  textShadow: TOOLTIP_TEXT_SHADOW
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
    <Box w="full" h="100%">
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
            stroke={c('inkSubtle', isDark)}
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
              value: 'Actions',
              angle: -90,
              position: 'insideLeft',
              offset: 10,
              fill: c('inkDark', isDark),
              fontWeight: 'bold',
            } : undefined}
          />
          <Tooltip
            content={<CustomTooltip />}
            wrapperStyle={{ fontFamily: 'inherit' }}
            offset={20}
          />
          {activeActionTypesWithStats.map((actionStat) => (
            <Bar
              key={actionStat.actionType}
              dataKey={actionStat.actionType}
              stackId="a"
              fill={getColorByIndex(actionTypeColorMap[actionStat.actionType] || 0)}
              stroke={c('inkSubtle', isDark)}
              strokeWidth={1}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}
