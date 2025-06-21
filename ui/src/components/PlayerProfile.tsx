import { Box, Text, VStack, HStack, Icon, Avatar, useMultiStyleConfig, useTheme } from '@chakra-ui/react';
import { FaUser, FaFlag } from 'react-icons/fa';
import ReactCountryFlag from 'react-country-flag';

interface PlayerProfileProps {
  profileId: string;
  profile: { id: string; name: string; avatarUrl?: string, country?: string, clanlist_name?: string } | null;
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
        <VStack spacing={1} align="center">
          <HStack spacing={theme.spacing.sm} align="center">
            {profile?.country ? (
              <ReactCountryFlag countryCode={profile.country} svg style={{ width: '1em', height: '1em' }} />
            ) : (
              <Icon as={FaFlag} w={3} h={3} color="brand.steel" />
            )}
            {profile?.clanlist_name && (
              <Text fontSize="xs" color="brand.steel">Clan: {profile.clanlist_name}</Text>
            )}
          </HStack>
          <Text sx={styles.id}>ID: {profileId}</Text>
        </VStack>
      </VStack>
    </VStack>
  );
} 