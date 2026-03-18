import { Box, Text, VStack, Image, HStack, useSlotRecipe } from '@chakra-ui/react';
import { Tooltip } from './ui/tooltip';
import type { LeaderboardStats } from '../types/stats';
import { getLeaderboardName } from '../utils/mappingUtils';
import { getTier } from '../utils/gameUtils';
import { useThemeMode } from '../theme/ThemeProvider';
import { assetManager } from '../utils/assetManager';
import { system } from '../theme/theme';

interface RankingCardProps {
  stats: LeaderboardStats[];
}

export function RankingCard({ stats }: RankingCardProps) {
  const recipe = useSlotRecipe({ key: 'rankingCard' });
  const styles = recipe();
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
    <Box css={styles.container}>
      <VStack gap={2} align="stretch">
        {rankedStats.map((stat: LeaderboardStats, index: number) => {
          const tier = getTier(stat.rating, stat.rank);
          const percentile = stat.rank === -1 ? 0 : (stat.rank / stat.ranktotal * 100).toFixed(1);
          
          const textProps = (() => {
            // Use tier colors for medaled players, default colors for unmedaled players
            if (!tier.showCrown) {
              return { color: isDark ? 'white' : 'brand.midnightBlue' };
            }
            if (tier.gradient) {
              // Use solid colors for better visibility in dark mode
              if (isDark) {
                return {
                  color: tier.name === 'Gold' ? system.token('colors.brand.tierGoldGradientDark', '') :
                         tier.name === 'Silver' ? system.token('colors.brand.tierSilverGradientDark', '') :
                         system.token('colors.brand.tierBronzeDark', '')
                };
              } else {
                const gradientColors = tier.name === 'Gold' ?
                  [system.token('colors.brand.tierGoldLight', ''), system.token('colors.brand.tierGoldGradientLight', '')] :
                  tier.name === 'Silver' ?
                  [system.token('colors.brand.tierSilverLight', ''), system.token('colors.brand.tierSilverGradientLight', '')] :
                  [system.token('colors.brand.tierBronzeLight', ''), system.token('colors.brand.tierBronzeGradientLight', '')];
                return {
                  backgroundImage: `linear-gradient(to bottom, ${gradientColors[0]}, ${gradientColors[1]})`,
                  backgroundClip: 'text',
                  color: 'transparent',
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
            <Box key={index} css={styles.rankingRow} position="relative" pr="60px">
              <HStack align="center" gap={3}>
                <Text css={styles.leaderboardName} minW="65px">
                  {getLeaderboardName(stat.leaderboard_id)}
                </Text>
                <Text css={styles.rankText} fontWeight="bold" {...textProps}>
                  {ordinalRank}
                </Text>
                <Text css={styles.percentileText}>
                  Top {percentile}%
                </Text>
              </HStack>
              {tier && tier.showCrown && stat.rank !== -1 && (
                <Tooltip content={tier.explainer} fontSize="xs">
                                        <Image
                        src={assetManager.getMedal(tier.name)}
                        alt={`${tier.name} medal`}
                        boxSize="28px"
                        objectFit="contain"
                        position="absolute"
                        right="4px"
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