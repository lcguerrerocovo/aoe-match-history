import { Box, Text, VStack, Divider, HStack, Icon, Heading, Table, Thead, Tbody, Tr, Th, Td, Avatar } from '@chakra-ui/react';
import { FaUser } from 'react-icons/fa';
import { useLayoutConfig } from '../theme/breakpoints';
import type { PersonalStats, LeaderboardStats } from '../types/stats';

interface ProfileHeaderProps {
  profileId: string;
  profile: { id: string; name: string; avatarUrl?: string } | null;
  stats: PersonalStats | null;
  isLoading: boolean;
}

const LEADERBOARD_NAMES: { [key: number]: string } = {
  3: 'RM 1v1',
  4: 'RM Team',
  13: 'EW Team',
  14: 'UNR'
};

export function ProfileHeader({ profileId, profile, stats, isLoading }: ProfileHeaderProps) {
  const playerName = isLoading ? 'Loading...' : profile?.name ?? profileId;
  const layout = useLayoutConfig();
  const playerInfo = stats?.statGroups?.[0]?.members?.[0];
  const leaderboardStats = stats?.leaderboardStats || [];

  // Filter out any leaderboard stats with invalid data
  const validLeaderboardStats = leaderboardStats.filter((stat: LeaderboardStats) => 
    stat && typeof stat.leaderboard_id === 'number' && 
    typeof stat.rating === 'number' && 
    typeof stat.rank === 'number'
  );

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
              w={layout?.profileHeader.avatar.size}
              h={layout?.profileHeader.avatar.size}
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
              w={layout?.profileHeader.avatar.size}
              h={layout?.profileHeader.avatar.size}
              bg="gray.50" 
              borderRadius="full" 
              display="flex" 
              alignItems="center" 
              justifyContent="center"
              border="2px"
              borderColor="gray.200"
            >
              <Icon as={FaUser} boxSize={layout?.profileHeader.avatar.iconSize} color="gray.400" />
            </Box>
          )}
          <VStack spacing={1}>
            <Text fontSize={layout?.profileHeader.text.nameSize} fontWeight="bold" textAlign="center" noOfLines={2}>{playerName}</Text>
            <Text fontSize={layout?.profileHeader.text.idSize} color="gray.500">ID: {profileId}</Text>
          </VStack>
        </VStack>

        <Divider />

        {/* Stats Section */}
        <VStack spacing={4} align="stretch">
          <Text fontSize="xs" fontWeight="medium" color="gray.500" px={2}>RANKINGS</Text>
          <Box w="100%" overflowX="auto">
            <Table size="xs" variant="simple" w="100%">
              <Thead>
                <Tr>
                  <Th width={layout?.profileHeader.table.boardWidth} fontSize="xs" whiteSpace="nowrap" textOverflow="ellipsis" overflow="hidden">Board</Th>
                  <Th isNumeric width={layout?.profileHeader.table.rankWidth} fontSize="xs">Rank</Th>
                  <Th isNumeric width={layout?.profileHeader.table.ratingWidth} fontSize="xs">Rating</Th>
                  <Th isNumeric width={layout?.profileHeader.table.maxWidth} fontSize="xs">Max</Th>
                  <Th width={layout?.profileHeader.table.changeWidth} fontSize="xs">Change</Th>
                </Tr>
              </Thead>
              <Tbody>
                {validLeaderboardStats.map((stat) => (
                  <Tr key={stat.leaderboard_id}>
                    <Td fontSize="xs" whiteSpace="nowrap" textOverflow="ellipsis" overflow="hidden">{LEADERBOARD_NAMES[stat.leaderboard_id] || `Board ${stat.leaderboard_id}`}</Td>
                    <Td isNumeric fontSize="xs">{stat.rank === -1 ? '' : `#${stat.rank.toLocaleString()}`}</Td>
                    <Td isNumeric fontSize="xs">{stat.rating.toLocaleString()}</Td>
                    <Td isNumeric fontSize="xs">{stat.highestrating?.toLocaleString() || '-'}</Td>
                    <Td isNumeric fontSize="xs" textAlign="right">
                      {stat.highestrating === 0 ? null : (
                        stat.rating === stat.highestrating ? (
                          <Text fontSize="xs" color="blue.600" fontWeight="bold">=</Text>
                        ) : (
                          <Text fontSize="xs" color="red.600" fontWeight="bold">-{Math.abs(stat.highestrating - stat.rating)}</Text>
                        )
                      )}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>

          <Text fontSize="xs" fontWeight="medium" color="gray.500" px={2} mt={2}>PERFORMANCE</Text>
          <Box w="100%" overflowX="auto">
            <Table size="xs" variant="simple" w="100%">
              <Thead>
                <Tr>
                  <Th width={layout?.profileHeader.table.boardWidth} fontSize="xs" whiteSpace="nowrap" textOverflow="ellipsis" overflow="hidden">Board</Th>
                  <Th isNumeric width={layout?.profileHeader.table.gamesWidth} fontSize="xs">Games</Th>
                  <Th isNumeric width={layout?.profileHeader.table.wonWidth} fontSize="xs">Won</Th>
                  <Th isNumeric width={layout?.profileHeader.table.streakWidth} fontSize="xs">Streak</Th>
                </Tr>
              </Thead>
              <Tbody>
                {validLeaderboardStats.map((stat) => {
                  const totalGames = stat.wins + stat.losses;
                  const winRate = totalGames > 0 ? (stat.wins / totalGames * 100).toFixed(2) : '0.00';
                  return (
                    <Tr key={stat.leaderboard_id}>
                      <Td fontSize="xs" whiteSpace="nowrap" textOverflow="ellipsis" overflow="hidden">{LEADERBOARD_NAMES[stat.leaderboard_id] || `Board ${stat.leaderboard_id}`}</Td>
                      <Td isNumeric fontSize="xs">{totalGames.toLocaleString()}</Td>
                      <Td isNumeric fontSize="xs">{winRate}%</Td>
                      <Td isNumeric fontSize="xs">{stat.streak > 0 ? `+${stat.streak}` : stat.streak}</Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </Box>
        </VStack>
      </VStack>
    </Box>
  );
} 