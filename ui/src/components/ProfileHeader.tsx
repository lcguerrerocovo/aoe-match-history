import { Box, Flex, useBreakpointValue, VStack, Separator, useSlotRecipe } from '@chakra-ui/react';
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

        {isLargeScreen && <Separator orientation="vertical" height="150px" />}

        <Box minW={{ md: '420px', lg: '450px'}} w={{ base: '100%', md: 'auto' }}>
            <PlayerStats stats={stats} />
        </Box>
      </Flex>
    </Box>
  );
} 