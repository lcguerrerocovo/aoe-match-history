import React from 'react';
import { Box, Table } from '@chakra-ui/react';
import type { LeaderboardStats } from '../types/stats';

interface ColumnConfig {
  header: string;
  isNumeric?: boolean;
  textAlign?: 'left' | 'center' | 'right';
  render: (stat: LeaderboardStats) => React.ReactNode;
  cellSx?: Record<string, unknown>;
}

interface StatsTableProps {
  data: LeaderboardStats[];
  columns: ColumnConfig[];
}

const thStyles = {
  color: { base: '{colors.brand.inkMuted}', _dark: '{colors.brand.inkMuted}' },
  textTransform: 'uppercase' as const,
  whiteSpace: 'nowrap' as const,
  fontSize: '2xs',
  fontWeight: 'bold',
  letterSpacing: 'wider',
  padding: '0.35rem 0.15rem',
  borderBottom: 'none',
  backgroundImage: { base: 'linear-gradient(to right, transparent, {colors.brand.inkMuted} 10%, {colors.brand.inkMuted} 90%, transparent)', _dark: 'linear-gradient(to right, transparent, {colors.brand.borderWarm} 10%, {colors.brand.borderWarm} 90%, transparent)' },
  backgroundSize: '100% 2px',
  backgroundPosition: 'bottom',
  backgroundRepeat: 'no-repeat',
};

const tdStyles = {
  color: { base: '{colors.brand.black}', _dark: '{colors.brand.inkDark}' },
  borderBottom: '1px solid',
  borderColor: { base: '{colors.brand.bronzeLight}', _dark: '{colors.brand.borderWarm}' },
  fontSize: 'xs',
  whiteSpace: 'nowrap' as const,
  textOverflow: 'ellipsis',
  overflow: 'hidden' as const,
  padding: '0.35rem 0.15rem',
};

const lastRowTdStyles = {
  ...tdStyles,
  borderBottom: 'none',
};

export function StatsTable({ data, columns }: StatsTableProps) {
  return (
    <Box w="100%" overflowX="auto" css={{ '& table, & thead, & tbody, & tr': { background: 'transparent' } }}>
      <Table.Root w="100%">
        <Table.Header>
          <Table.Row>
            {columns.map((column, index) => (
              <Table.ColumnHeader
                key={index}
                textAlign={column.isNumeric ? 'right' : column.textAlign}
                css={thStyles}
              >
                {column.header}
              </Table.ColumnHeader>
            ))}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {data.map((stat, rowIndex) => (
            <Table.Row key={stat.leaderboard_id}>
              {columns.map((column, colIndex) => (
                <Table.Cell
                  key={colIndex}
                  textAlign={column.isNumeric ? 'right' : column.textAlign}
                  css={{
                    ...(rowIndex === data.length - 1 ? lastRowTdStyles : tdStyles),
                    ...column.cellSx,
                    ...(colIndex === 0 ? {
                      fontVariantCaps: 'small-caps',
                      letterSpacing: '0.03em',
                      fontWeight: 600,
                      borderLeft: '2px solid',
                      borderLeftColor: { base: 'rgba(139,90,43,0.25)', _dark: 'rgba(255,255,255,0.15)' },
                      paddingLeft: '8px',
                    } : {}),
                  }}
                >
                  {column.render(stat)}
                </Table.Cell>
              ))}
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Box>
  );
}
