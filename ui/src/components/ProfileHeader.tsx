import { Box, Flex, Text, useBreakpointValue, VStack, useSlotRecipe } from '@chakra-ui/react';
import { PlayerProfile } from './PlayerProfile';
import { PlayerStats } from './PlayerStats';
import { RankingCard } from './RankingCard';
import type { PersonalStats } from '../types/stats';
import { useLayoutConfig } from '../theme/breakpoints';

interface ProfileHeaderProps {
  profileId: string;
  profile: { id: string; name: string; avatarUrl?: string } | null;
  stats: PersonalStats | null;
  isLoading: boolean;
}

export function ProfileHeader({ profileId, profile, stats, isLoading }: ProfileHeaderProps) {
  const recipe = useSlotRecipe({ key: 'profileHeader' });
  const styles = recipe();
  const layout = useLayoutConfig();
  const isLargeScreen = useBreakpointValue({ base: false, md: true });

  const ruledLineColor = { base: 'rgba(139, 90, 43, 0.3)', _dark: 'rgba(255, 255, 255, 0.15)' };

  return (
    <Box css={styles.container}>
      <Flex
        direction={{ base: 'column', md: 'row' }}
        align={{ base: 'stretch', md: 'center' }}
        justify="center"
        maxW={layout.matchList.width}
        w="100%"
        mx="auto"
        gap={6}
        data-testid="profile-header-stack"
      >
        <Flex flex={1} justify="center">
            <Box
              w="1px"
              alignSelf="stretch"
              mr={3}
              bg={{ base: 'linear-gradient(to bottom, transparent, rgba(139,90,43,0.25) 15%, rgba(139,90,43,0.25) 85%, transparent)', _dark: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.1) 15%, rgba(255,255,255,0.1) 85%, transparent)' }}
              display={{ base: 'none', md: 'block' }}
            />
            <VStack gap={4} align="center" w="100%">
                <PlayerProfile
                    profileId={profileId}
                    profile={profile}
                    isLoading={isLoading}
                />
                {stats?.leaderboardStats && (
                    <RankingCard stats={stats.leaderboardStats} />
                )}
            </VStack>
        </Flex>

        {isLargeScreen && (
          <Box
            alignSelf="stretch"
            w="1px"
            bg={ruledLineColor}
            my={2}
          />
        )}

        {!isLargeScreen && (
          <Box
            w="80%"
            mx="auto"
            h="1px"
            bg={ruledLineColor}
          />
        )}

        <Box minW={{ md: '420px', lg: '450px'}} w={{ base: '100%', md: 'auto' }}>
            <Text
              fontSize="2xs"
              textTransform="uppercase"
              letterSpacing="wider"
              color="brand.inkMuted"
              mb={{ base: 1, md: 2 }}
              fontWeight="bold"
              lineHeight="1"
              textAlign={{ base: 'center', md: 'left' }}
            >
              Record
            </Text>
            <PlayerStats stats={stats} />
        </Box>
      </Flex>
    </Box>
  );
} 