import { Box, Text, VStack, useMultiStyleConfig, Tooltip, Image, HStack, useTheme } from '@chakra-ui/react';
import type { LeaderboardStats } from '../types/stats';
import { getLeaderboardName } from '../utils/mappingUtils';
import { getTier } from '../utils/gameUtils';
import { useThemeMode } from '../theme/ThemeProvider';

interface RankingCardProps {
  stats: LeaderboardStats[];
}

export function RankingCard({ stats }: RankingCardProps) {
  const styles = useMultiStyleConfig('RankingCard', {});
  const { isDark } = useThemeMode();
  const theme = useTheme();

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
            // Always use tier colors for rank text, even if no tier (use default colors)
            if (!tier) {
              return { color: isDark ? theme.colors.brand.tierBronzeDark : theme.colors.brand.tierBronzeLight };
            }
            if (tier.gradient) {
              // Use solid colors for better visibility in dark mode
              if (isDark) {
                return {
                  color: tier.name === 'Gold' ? theme.colors.brand.tierGoldGradientDark :
                         tier.name === 'Silver' ? theme.colors.brand.tierSilverGradientDark :
                         theme.colors.brand.tierBronzeDark
                };
              } else {
                return {
                  bgGradient: tier.name === 'Gold' ? 
                    `linear(to-b, ${theme.colors.brand.tierGoldLight}, ${theme.colors.brand.tierGoldGradientLight})` :
                    tier.name === 'Silver' ? 
                    `linear(to-b, ${theme.colors.brand.tierSilverLight}, ${theme.colors.brand.tierSilverGradientLight})` :
                    `linear(to-b, ${theme.colors.brand.tierBronzeLight}, ${theme.colors.brand.tierBronzeGradientLight})`,
                  bgClip: 'text' as const,
                };
              }
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
            <Box key={index} sx={styles.rankingRow} position="relative" pr="60px">
              <HStack justify="space-between" align="center" spacing={3}>
                <Text sx={styles.leaderboardName} flex={1}>
                  {getLeaderboardName(stat.leaderboard_id)}
                </Text>
                <Text sx={styles.rankText} fontWeight="bold" textAlign="right" {...textProps}>
                  {ordinalRank}
                </Text>
                <Text sx={styles.percentileText} textAlign="right" pr="40px">
                  Top {percentile}%
                </Text>
              </HStack>
              {tier && tier.showCrown && stat.rank !== -1 && (
                <Tooltip label={tier.explainer} fontSize="xs">
                  <Image
                    src={`/src/assets/medals/${tier.name.toLowerCase()}.png`}
                    alt={`${tier.name} medal`}
                    boxSize="28px"
                    objectFit="contain"
                    position="absolute"
                    right="12px"
                    top="60%"
                    transform="translateY(-50%)"
                    data-testid="tier-medal"
                  />
                </Tooltip>
              )}
            </Box>
          );
        })}
      </VStack>
    </Box>
  );
} 