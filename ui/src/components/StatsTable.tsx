import React from 'react';
import { Box, Table, Thead, Tbody, Tr, Th, Td, type BoxProps } from '@chakra-ui/react';
import type { LeaderboardStats } from '../types/stats';

interface ColumnConfig {
  header: string;
  isNumeric?: boolean;
  textAlign?: 'left' | 'center' | 'right';
  render: (stat: LeaderboardStats) => React.ReactNode;
  cellSx?: BoxProps['sx'];
}

interface StatsTableProps {
  data: LeaderboardStats[];
  columns: ColumnConfig[];
}

export function StatsTable({ data, columns }: StatsTableProps) {
  return (
    <Box w="100%" overflowX="auto">
      <Table size="xs" variant="simple" w="100%">
        <Thead>
          <Tr>
            {columns.map((column, index) => (
              <Th 
                key={index}
                isNumeric={column.isNumeric}
                textAlign={column.textAlign}
              >
                {column.header}
              </Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {data.map((stat) => (
            <Tr key={stat.leaderboard_id}>
              {columns.map((column, index) => (
                <Td 
                  key={index}
                  isNumeric={column.isNumeric}
                  textAlign={column.textAlign}
                  sx={column.cellSx}
                >
                  {column.render(stat)}
                </Td>
              ))}
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
} 