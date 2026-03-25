import { Box, Text, useSlotRecipe } from '@chakra-ui/react';
import type { PersonalStats, LeaderboardStats } from '../types/stats';
import { getLeaderboardName } from '../utils/mappingUtils';
import { StatsTable } from './StatsTable';

interface PlayerStatsProps {
  stats: PersonalStats | null;
}

export function PlayerStats({ stats }: PlayerStatsProps) {
  const recipe = useSlotRecipe({ key: 'playerStats' });
  const styles = recipe();

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

  const combinedColumns = [
    {
      header: 'Board',
      render: (stat: LeaderboardStats) => getLeaderboardName(stat.leaderboard_id)
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

  const cornerMarkStyles = {
    position: 'absolute' as const,
    w: '10px',
    h: '10px',
    display: { base: 'none' as const, md: 'block' as const },
  };

  const cornerBorderColor = { base: 'rgba(139,90,43,0.4)', _dark: 'rgba(255,255,255,0.12)' };

  return (
    <Box css={styles.container}>
      {/* Corner marks */}
      <Box {...cornerMarkStyles} top="6px" left="6px" borderTop="1.5px solid" borderLeft="1.5px solid" borderColor={cornerBorderColor} />
      <Box {...cornerMarkStyles} top="6px" right="6px" borderTop="1.5px solid" borderRight="1.5px solid" borderColor={cornerBorderColor} />
      <Box {...cornerMarkStyles} bottom="6px" left="6px" borderBottom="1.5px solid" borderLeft="1.5px solid" borderColor={cornerBorderColor} />
      <Box {...cornerMarkStyles} bottom="6px" right="6px" borderBottom="1.5px solid" borderRight="1.5px solid" borderColor={cornerBorderColor} />
      <Box css={styles.statsTable}>
        <StatsTable data={validLeaderboardStats} columns={combinedColumns} />
      </Box>
    </Box>
  );
} 