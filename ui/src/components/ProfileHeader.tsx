import { Box, VStack, Divider, useMultiStyleConfig } from '@chakra-ui/react';
import { PlayerProfile } from './PlayerProfile';
import { PlayerStats } from './PlayerStats';
import type { PersonalStats } from '../types/stats';

interface ProfileHeaderProps {
  profileId: string;
  profile: { id: string; name: string; avatarUrl?: string } | null;
  stats: PersonalStats | null;
  isLoading: boolean;
}

export function ProfileHeader({ profileId, profile, stats, isLoading }: ProfileHeaderProps) {
  const styles = useMultiStyleConfig('ProfileHeader', {});
  
  return (
    <Box sx={styles.container}>
      <VStack spacing={2} align="stretch">
        <PlayerProfile 
          profileId={profileId}
          profile={profile}
          isLoading={isLoading}
        />
        <Divider />
        <PlayerStats stats={stats} />
      </VStack>
    </Box>
  );
} 