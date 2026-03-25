import { Box, Text, VStack, HStack, Icon, Avatar, useSlotRecipe } from '@chakra-ui/react';
import { FaUser, FaFlag } from 'react-icons/fa';
import ReactCountryFlag from 'react-country-flag';
import { componentSpacing } from '../theme/theme';

interface PlayerProfileProps {
  profileId: string;
  profile: { id: string; name: string; avatarUrl?: string, country?: string, clanlist_name?: string } | null;
  isLoading: boolean;
}

export function PlayerProfile({ profileId, profile, isLoading }: PlayerProfileProps) {
  const playerName = isLoading ? 'Loading...' : profile?.name ?? profileId;
  const recipe = useSlotRecipe({ key: 'profileHeader' });
  const styles = recipe();

  return (
    <VStack gap={componentSpacing.profileSpacing} align="center">
      <Box
        css={styles.avatar}
        borderRadius="full"
        display="flex"
        alignItems="center"
        justifyContent="center"
        overflow="hidden"
      >
        {profile?.avatarUrl ? (
          <Avatar.Root size="full"><Avatar.Fallback /><Avatar.Image src={profile.avatarUrl} /></Avatar.Root>
        ) : (
          <Icon w="50%" h="50%"><FaUser /></Icon>
        )}
      </Box>
      <VStack gap="0.25rem">
        <Text css={styles.name} textAlign="center" lineClamp={2}>{playerName}</Text>
        <VStack gap={1} align="center">
          <HStack gap="0.5rem" align="center">
            {profile?.country ? (
              <ReactCountryFlag countryCode={profile.country} svg style={{ width: '1em', height: '1em' }} />
            ) : (
              <Icon w={3} h={3} color="brand.inkMuted"><FaFlag /></Icon>
            )}
            {profile?.clanlist_name && (
              <Text fontSize="xs" color="brand.inkMuted" fontStyle="italic">Clan: {profile.clanlist_name}</Text>
            )}
          </HStack>
          <Text css={styles.id} letterSpacing="wider">ID: {profileId}</Text>
        </VStack>
      </VStack>
    </VStack>
  );
} 