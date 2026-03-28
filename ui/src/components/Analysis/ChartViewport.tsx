import { Box } from '@chakra-ui/react';
import type { ReactNode } from 'react';

interface ChartViewportProps {
  children: ReactNode;
  dataPointCount: number;
}

export function ChartViewport({ children, dataPointCount }: ChartViewportProps) {
  const innerWidth = Math.max(800, dataPointCount * 20);

  return (
    <Box
      h={{ base: '480px', md: '440px' }}
      minH="440px"
      overflowX="auto"
      overflowY="hidden"
      data-testid="chart-container"
    >
      <Box minW={`${innerWidth}px`} h="100%">
        {children}
      </Box>
    </Box>
  );
}
