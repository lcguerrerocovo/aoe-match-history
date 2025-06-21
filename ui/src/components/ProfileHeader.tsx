import { Box, Divider, useMultiStyleConfig, Flex, useBreakpointValue } from '@chakra-ui/react';
import { PlayerProfile } from './PlayerProfile';
import { PlayerStats } from './PlayerStats';
import type { PersonalStats } from '../types/stats';
import { useLayoutConfig } from '../theme/breakpoints';

interface ProfileHeaderProps {
  profileId: string;
  profile: { id: string; name: string; avatarUrl?: string } | null;
  stats: PersonalStats | null;
  isLoading: boolean;
}

export function ProfileHeader({ profileId, profile, stats, isLoading }: ProfileHeaderProps) {
  const styles = useMultiStyleConfig('ProfileHeader', {});
  const layout = useLayoutConfig();
  const isLargeScreen = useBreakpointValue({ base: false, md: true });
  
  return (
    <Box sx={styles.container}>
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
            <PlayerProfile 
                profileId={profileId}
                profile={profile}
                isLoading={isLoading}
            />
        </Flex>

        {isLargeScreen && <Divider orientation="vertical" height="150px" />}

        <Box minW={{ md: '420px', lg: '450px'}}>
            <PlayerStats stats={stats} />
        </Box>
      </Flex>
    </Box>
  );
} 