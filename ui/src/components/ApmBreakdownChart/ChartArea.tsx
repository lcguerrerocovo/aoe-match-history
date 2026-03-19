import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import type { TooltipProps } from 'recharts';
import { Box, Text, Flex, useBreakpointValue } from '@chakra-ui/react';
import { useThemeMode } from '../../theme/ThemeProvider';
import { getColorByIndex } from './utils';

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
  const chartAreaHeight = useBreakpointValue({ base: '450px', md: '400px' });
  const showAxisLabel = useBreakpointValue({ base: false, md: true });

  // Viewport configuration for horizontal scrolling
  const minBarWidth = 20;
  const chartWidth = Math.max(800, chartData.length * minBarWidth);

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
                  textShadow: '0 1px 2px rgba(0,0,0,0.6)'
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
    <Box h={chartAreaHeight} minH="500px" overflowX="auto" overflowY="hidden" data-testid="chart-container">
      <Box minW={`${chartWidth}px`} h="100%">
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
            stroke={isDark ? '#CBD5E0' : '#C4B59A'}
            strokeOpacity={isDark ? 1 : 0.4}
            fill="transparent"
          />
          <XAxis
            dataKey="minute"
            stroke={isDark ? '#F7FAFC' : '#3B2614'}
            label={showAxisLabel ? {
              value: 'Minute',
              position: 'insideBottom',
              offset: -5,
              fill: isDark ? '#F7FAFC' : '#3B2614',
              fontWeight: 'bold',
            } : undefined}
          />
          <YAxis
            stroke={isDark ? '#F7FAFC' : '#3B2614'}
            label={showAxisLabel ? {
              value: 'Actions',
              angle: -90,
              position: 'insideLeft',
              offset: 10,
              fill: isDark ? '#F7FAFC' : '#3B2614',
              fontWeight: 'bold',
            } : undefined}
          />
          <Tooltip
            content={<CustomTooltip />}
            wrapperStyle={{ fontFamily: 'inherit' }}
            offset={30}
          />
          {activeActionTypesWithStats.map((actionStat) => (
            <Bar
              key={actionStat.actionType}
              dataKey={actionStat.actionType}
              stackId="a"
              fill={getColorByIndex(actionTypeColorMap[actionStat.actionType] || 0)}
              stroke={isDark ? '#CBD5E0' : '#C4B59A'}
              strokeWidth={1}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
      </Box>
    </Box>
  );
}
