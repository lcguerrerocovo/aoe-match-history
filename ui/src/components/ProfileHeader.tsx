import { Box, Flex, Text, useBreakpointValue, VStack, Skeleton, SkeletonCircle, HStack, useSlotRecipe } from '@chakra-ui/react';
import { PlayerProfile } from './PlayerProfile';
import { PlayerStats } from './PlayerStats';
import { RankingCard } from './RankingCard';
import type { PersonalStats } from '../types/stats';
import { useLayoutConfig } from '../theme/breakpoints';
import { componentSpacing } from '../theme/theme';
import { FaFlag } from 'react-icons/fa';
import { Icon } from '@chakra-ui/react';
import { AnimatedHeight } from './ui/animated-height';

function ProfileSkeleton({ profileId }: { profileId: string }) {
  const recipe = useSlotRecipe({ key: 'profileHeader' });
  const styles = recipe();

  return (
    <VStack gap={4} align="center" w="100%">
      <VStack gap={componentSpacing.profileSpacing} align="center">
        <Box
          css={styles.avatar}
          borderRadius="full"
          display="flex"
          alignItems="center"
          justifyContent="center"
          overflow="hidden"
        >
          <SkeletonCircle size="full" variant="shine" />
        </Box>
        <VStack gap="0.25rem">
          <Skeleton variant="shine" h="1.75em" w="160px" borderRadius="sm" />
          <Box
            h="2px"
            w="80%"
            mx="auto"
            borderRadius="1px"
            mt={1}
            bg={{ base: 'linear-gradient(to right, transparent, #6B5240 15%, #6B5240 85%, transparent)', _dark: 'linear-gradient(to right, transparent, rgba(255,255,255,0.3) 15%, rgba(255,255,255,0.3) 85%, transparent)' }}
          />
          <VStack gap={1} align="center">
            <HStack gap="0.5rem" align="center">
              <Icon w={3} h={3} color="brand.inkMuted"><FaFlag /></Icon>
            </HStack>
            <Text css={styles.id} letterSpacing="wider">ID: {profileId}</Text>
          </VStack>
        </VStack>
      </VStack>
      {/* Ranking skeleton */}
      <VStack gap={2} align="stretch" w="100%" maxW="240px" p="0.3rem">
        {[1, 2].map(i => (
          <HStack key={i} gap={3} px={2} py="0.35rem">
            <Skeleton variant="shine" h="1em" w="65px" borderRadius="sm" />
            <Skeleton variant="shine" h="1em" w="45px" borderRadius="sm" />
            <Skeleton variant="shine" h="1em" w="60px" borderRadius="sm" />
          </HStack>
        ))}
      </VStack>
    </VStack>
  );
}

function StatsSkeleton() {
  return (
    <Box p="1rem">
      <HStack gap={3} mb={3}>
        {['60px', '48px', '36px', '32px', '42px', '42px', '42px'].map((w, i) => (
          <Skeleton key={i} variant="shine" h="0.75em" w={w} borderRadius="sm" />
        ))}
      </HStack>
      {[1, 2, 3].map(i => (
        <HStack key={i} gap={3} py="0.5rem" borderBottom="1px solid" borderColor={{ base: 'brand.bronzeLight', _dark: 'brand.borderWarm' }}>
          {['60px', '48px', '36px', '32px', '42px', '42px', '42px'].map((w, j) => (
            <Skeleton key={j} variant="shine" h="1em" w={w} borderRadius="sm" />
          ))}
        </HStack>
      ))}
    </Box>
  );
}

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
      <AnimatedHeight>
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
              {isLoading ? (
                <ProfileSkeleton profileId={profileId} />
              ) : (
                <VStack gap={4} align="center" w="100%" className="profile-fade-in">
                  <PlayerProfile
                      profileId={profileId}
                      profile={profile}
                      isLoading={false}
                  />
                  {stats?.leaderboardStats && (
                      <RankingCard stats={stats.leaderboardStats} />
                  )}
                </VStack>
              )}
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
              {isLoading ? (
                <StatsSkeleton />
              ) : (
                <Box className="profile-fade-in"><PlayerStats stats={stats} /></Box>
              )}
          </Box>
        </Flex>
      </AnimatedHeight>
    </Box>
  );
}
