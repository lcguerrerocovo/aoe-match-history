import React from 'react';
import { Box, Text, VStack, useMultiStyleConfig, useTheme } from '@chakra-ui/react';
import type { PersonalStats, LeaderboardStats } from '../types/stats';
import { getLeaderboardName } from '../utils/leaderboardUtils';
import { StatsTable } from './StatsTable';

interface PlayerStatsProps {
  stats: PersonalStats | null;
}

export function PlayerStats({ stats }: PlayerStatsProps) {
  const styles = useMultiStyleConfig('PlayerStats', {});
  const theme = useTheme();

  if (!stats?.statGroups?.[0]?.members?.[0]) {
    return null;
  }

  const leaderboardStats = stats?.leaderboardStats || [];

  // Filter out any leaderboard stats with invalid data
  const validLeaderboardStats = leaderboardStats.filter((stat: LeaderboardStats) => 
    stat && typeof stat.leaderboard_id === 'number' && 
    typeof stat.rating === 'number' && 
    typeof stat.rank === 'number'
  );

  const rankingColumns = [
    {
      header: 'Board',
      render: (stat: LeaderboardStats) => getLeaderboardName(stat.leaderboard_id)
    },
    {
      header: 'Rank',
      isNumeric: true,
      render: (stat: LeaderboardStats) => (
        <Text className="rank">{stat.rank === -1 ? '' : stat.rank}</Text>
      )
    },
    {
      header: 'Top %',
      isNumeric: true,
      render: (stat: LeaderboardStats) => {
        const percentile = stat.rank === -1 ? 0 : (stat.rank / stat.ranktotal * 100).toFixed(1);
        return <Text className="percentile" fontWeight="900">{stat.rank === -1 ? '' : percentile}</Text>;
      }
    },
    {
      header: 'Rating',
      isNumeric: true,
      render: (stat: LeaderboardStats) => stat.rating
    },
    {
      header: 'Max',
      isNumeric: true,
      render: (stat: LeaderboardStats) => stat.highestrating || '-'
    },
    {
      header: 'Diff',
      textAlign: 'right' as const,
      render: (stat: LeaderboardStats) => {
        if (stat.highestrating === 0) return null;
        return stat.rating === stat.highestrating ? (
          <Text as="span" className="rank">=</Text>
        ) : (
          <Text as="span" className="loss">-{Math.abs(stat.highestrating - stat.rating)}</Text>
        );
      }
    }
  ];

  const performanceColumns = [
    {
      header: 'Board',
      render: (stat: LeaderboardStats) => getLeaderboardName(stat.leaderboard_id)
    },
    {
      header: 'Games',
      isNumeric: true,
      render: (stat: LeaderboardStats) => stat.wins + stat.losses
    },
    {
      header: 'Won',
      isNumeric: true,
      render: (stat: LeaderboardStats) => {
        const totalGames = stat.wins + stat.losses;
        const winRate = totalGames > 0 ? (stat.wins / totalGames * 100).toFixed(2) : '0.00';
        return `${winRate}%`;
      }
    },
    {
      header: 'Streak',
      isNumeric: true,
      render: (stat: LeaderboardStats) => {
        if (stat.streak > 0) {
          return <Text as="span" className="streak">+{stat.streak}</Text>;
        } else if (stat.streak < 0) {
          return <Text as="span" className="loss">{stat.streak}</Text>;
        }
        return stat.streak;
      }
    }
  ];

  return (
    <Box sx={styles.container}>
      <VStack spacing={theme.spacing.component.statsSpacing} align="stretch" sx={styles.statsTable}>
        <StatsTable data={validLeaderboardStats} columns={rankingColumns} />
        <StatsTable data={validLeaderboardStats} columns={performanceColumns} />
      </VStack>
    </Box>
  );
} 