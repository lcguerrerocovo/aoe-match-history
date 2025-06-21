import { Box, Text, VStack, HStack, Icon, Avatar, useMultiStyleConfig, useTheme } from '@chakra-ui/react';
import { FaUser, FaFlag } from 'react-icons/fa';

interface PlayerProfileProps {
  profileId: string;
  profile: { id: string; name: string; avatarUrl?: string } | null;
  isLoading: boolean;
}

export function PlayerProfile({ profileId, profile, isLoading }: PlayerProfileProps) {
  const playerName = isLoading ? 'Loading...' : profile?.name ?? profileId;
  const styles = useMultiStyleConfig('ProfileHeader', {});
  const theme = useTheme();

  return (
    <VStack spacing={theme.spacing.component.profileSpacing} align="center">
      <Box
        sx={styles.avatar}
        borderRadius="full"
        display="flex"
        alignItems="center"
        justifyContent="center"
        overflow="hidden"
      >
        {profile?.avatarUrl ? (
          <Avatar
            size="full"
            src={profile.avatarUrl}
          />
        ) : (
          <Icon as={FaUser} w="50%" h="50%" />
        )}
      </Box>
      <VStack spacing={theme.spacing.xs}>
        <Text sx={styles.name} textAlign="center" noOfLines={2}>{playerName}</Text>
        <HStack spacing={theme.spacing.sm} align="center">
          <Icon as={FaFlag} w={3} h={3} color="brand.steel" />
          <Text sx={styles.id}>ID: {profileId}</Text>
        </HStack>
      </VStack>
    </VStack>
  );
} 