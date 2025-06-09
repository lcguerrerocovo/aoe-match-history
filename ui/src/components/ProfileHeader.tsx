import { Box, Text, VStack, Divider, HStack, Icon, Heading, Stat, StatLabel, StatNumber, StatHelpText, Avatar } from '@chakra-ui/react';
import { FaUser, FaTrophy, FaChartLine } from 'react-icons/fa';
import { useLayoutConfig } from '../theme/breakpoints';
import type { PersonalStats } from '../types/stats';

interface ProfileHeaderProps {
  profileId: string;
  profile: { id: string; name: string; avatarUrl?: string } | null;
  stats: PersonalStats | null;
  isLoading: boolean;
}

export function ProfileHeader({ profileId, profile, stats, isLoading }: ProfileHeaderProps) {
  const playerName = isLoading ? 'Loading...' : profile?.name ?? profileId;
  const layout = useLayoutConfig();
  const leaderboardStats = stats?.leaderboardStats.find(s => s.leaderboard_id === 3); // 3 is 1v1 RM
  const playerInfo = stats?.statGroups[0]?.members[0];

  return (
    <Box
      w={layout?.profileHeader.width}
      h={layout?.profileHeader.height}
      p={layout?.profileHeader.padding}
      mb={layout?.profileHeader.marginBottom}
      borderRight={layout?.profileHeader.borderRight}
      borderBottom={layout?.profileHeader.borderBottom}
      position={layout?.profileHeader.position}
      top={layout?.profileHeader.top}
      left={layout?.profileHeader.left}
      zIndex={layout?.profileHeader.zIndex}
      bg="white"
    >
      <VStack spacing={6} align="stretch">
        {/* Profile Section */}
        <VStack spacing={4} align="center" pb={4}>
          {profile?.avatarUrl ? (
            <Box 
              w="120px"
              h="120px"
              bg="gray.50" 
              borderRadius="full" 
              display="flex" 
              alignItems="center" 
              justifyContent="center"
              border="2px"
              borderColor="gray.200"
              overflow="hidden"
            >
              <Avatar 
                size="full"
                src={profile.avatarUrl}
              />
            </Box>
          ) : (
            <Box 
              w="120px"
              h="120px"
              bg="gray.50" 
              borderRadius="full" 
              display="flex" 
              alignItems="center" 
              justifyContent="center"
              border="2px"
              borderColor="gray.200"
            >
              <Icon as={FaUser} boxSize={8} color="gray.400" />
            </Box>
          )}
          <VStack spacing={1}>
            <Text fontSize="xl" fontWeight="bold">{playerName}</Text>
            <Text fontSize="sm" color="gray.500">ID: {profileId}</Text>
          </VStack>
        </VStack>

        <Divider />

        {/* Stats Section */}
        <VStack spacing={4} align="stretch">
          <Text fontSize="sm" fontWeight="medium" color="gray.500" px={2}>STATS</Text>
          
          <HStack 
            p={3}
            bg="gray.50" 
            borderRadius="md"
            cursor="pointer"
            _hover={{ bg: 'gray.100' }}
            transition="all 0.2s"
          >
            <Icon as={FaTrophy} color="yellow.500" />
            <VStack align="start" spacing={0}>
              <Text fontSize="sm" fontWeight="medium">Win Rate</Text>
              <Text fontSize="xs" color="gray.500">Coming soon</Text>
            </VStack>
          </HStack>

          <HStack 
            p={3}
            bg="gray.50" 
            borderRadius="md"
            cursor="pointer"
            _hover={{ bg: 'gray.100' }}
            transition="all 0.2s"
          >
            <Icon as={FaChartLine} color="blue.500" />
            <VStack align="start" spacing={0}>
              <Text fontSize="sm" fontWeight="medium">Performance</Text>
              <Text fontSize="xs" color="gray.500">Coming soon</Text>
            </VStack>
          </HStack>
        </VStack>
      </VStack>
    </Box>
  );
} 