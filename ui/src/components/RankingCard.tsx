import { Box, Text, VStack, useMultiStyleConfig, Tooltip, Image, HStack } from '@chakra-ui/react';
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
                  (isDark ? `linear(to-b, brand.tierGoldDark, brand.tierGoldGradientDark)` : `linear(to-b, brand.tierGoldLight, brand.tierGoldGradientLight)`) :
                  tier.name === 'Silver' ? 
                  (isDark ? `linear(to-b, brand.tierSilverDark, brand.tierSilverGradientDark)` : `linear(to-b, brand.tierSilverLight, brand.tierSilverGradientLight)`) :
                  (isDark ? `linear(to-b, brand.tierBronzeDark, brand.tierBronzeGradientDark)` : `linear(to-b, brand.tierBronzeLight, brand.tierBronzeGradientLight)`),
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
                    <Box 
                      as="span" 
                      data-testid="tier-medal"
                      position="relative"
                      display="flex"
                      alignItems="center"
                      minW="32px"
                      h="100%"
                    >
                      <Image
                        src={`/src/assets/medals/${tier.name.toLowerCase()}.png`}
                        alt={`${tier.name} medal`}
                        boxSize="28px"
                        objectFit="contain"
                        position="absolute"
                        right="0px"
                        top="40%"
                        transform="translateY(-40%)"
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