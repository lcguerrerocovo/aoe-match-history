import { Box, Text, VStack, useMultiStyleConfig, useTheme, Tooltip, Icon, HStack } from '@chakra-ui/react';
import { FaCrown } from 'react-icons/fa';
import type { LeaderboardStats } from '../types/stats';
import { getLeaderboardName } from '../utils/mappingUtils';
import { getTier } from '../utils/gameUtils';
import { useThemeMode } from '../theme/ThemeProvider';

interface RankingCardProps {
  stats: LeaderboardStats[];
}

export function RankingCard({ stats }: RankingCardProps) {
  const styles = useMultiStyleConfig('RankingCard', {});
  const theme = useTheme();
  const { isDark } = useThemeMode();

  // Define all available leaderboards
  const allLeaderboards = [
    { id: 3, name: 'RM 1v1' },
    { id: 4, name: 'RM Team' },
    { id: 1, name: 'DM 1v1' },
    { id: 2, name: 'DM Team' },
    { id: 13, name: 'EW 1v1' },
    { id: 14, name: 'EW Team' }
  ];

  // Create a map of existing stats by leaderboard_id
  const statsMap = new Map(
    stats
      .filter((stat: LeaderboardStats) => 
        stat && typeof stat.leaderboard_id === 'number' && 
        typeof stat.rating === 'number' && 
        typeof stat.rank === 'number'
      )
      .map(stat => [stat.leaderboard_id, stat])
  );

  // Only show leaderboards where player has stats (rank !== -1)
  const rankedStats = Array.from(statsMap.values()).filter(stat => stat.rank !== -1);

  if (rankedStats.length === 0) {
    return null;
  }

  return (
    <Box sx={styles.container}>
      <VStack spacing={2} align="stretch">
        {rankedStats.map((stat: LeaderboardStats, index: number) => {
          const tier = getTier(stat.rating, stat.rank);
          const percentile = stat.rank === -1 ? 0 : (stat.rank / stat.ranktotal * 100).toFixed(1);
          
          const textProps = (() => {
            if (!tier) return { color: 'brand.midnightBlue' };
            if (tier.gradient) {
              return {
                bgGradient: tier.name === 'Gold' ? 
                  (isDark ? 'linear(to-b, #FFD700, #FFB347)' : 'linear(to-b, #D4AF37, #B8860B)') :
                  tier.name === 'Silver' ? 
                  (isDark ? 'linear(to-b, #F5F5F5, #D3D3D3)' : 'linear(to-b, #696969, #808080)') :
                  (isDark ? 'linear(to-b, #CD853F, #D2691E)' : 'linear(to-b, #8B4513, #A0522D)'),
                bgClip: 'text' as const,
              };
            }
            return { color: tier.color };
          })();

          // Create ordinal suffix for rank
          const getOrdinalSuffix = (num: number) => {
            if (num >= 11 && num <= 13) return 'th';
            switch (num % 10) {
              case 1: return 'st';
              case 2: return 'nd';
              case 3: return 'rd';
              default: return 'th';
            }
          };

          const ordinalRank = `${stat.rank}${getOrdinalSuffix(stat.rank)}`;

          return (
            <Box key={index} sx={styles.rankingRow}>
              <HStack justify="space-between" align="center" spacing={3}>
                <Text sx={styles.leaderboardName} flex={1}>
                  {getLeaderboardName(stat.leaderboard_id)}
                </Text>
                <Text sx={styles.rankText} fontWeight="bold" textAlign="right" {...textProps}>
                  {ordinalRank}
                </Text>
                <Text sx={styles.percentileText} textAlign="right">
                  Top {percentile}%
                </Text>
                {tier && tier.showCrown && stat.rank !== -1 && (
                  <Tooltip label={tier.explainer} fontSize="xs">
                    <Box as="span" data-testid="tier-crown">
                                              <Icon
                          as={FaCrown}
                          color={tier.name === 'Gold' ? (isDark ? '#FFD700' : '#D4AF37') : 
                                tier.name === 'Silver' ? (isDark ? '#F5F5F5' : '#696969') : 
                                (isDark ? '#CD853F' : '#8B4513')}
                          boxSize="14px"
                        />
                    </Box>
                  </Tooltip>
                )}
              </HStack>
            </Box>
          );
        })}
      </VStack>
    </Box>
  );
} 