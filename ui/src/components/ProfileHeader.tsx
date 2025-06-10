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
  0: 'Unranked',
  1: 'DM 1v1',
  2: 'DM Team',
  3: 'RM 1v1',
  4: 'RM Team',
  13: 'EW 1v1',
  14: 'EW Team',
  15: 'RM 1v1 (UNR)',
  16: 'RM Team (UNR)',
  17: 'EW 1v1 (UNR)',
  18: 'EW Team (UNR)',
  19: 'RM 1v1 (QM)',
  20: 'RM Team (QM)',
  21: 'EW 1v1 (QM)',
  22: 'EW Team (QM)'
};

const getLeaderboardName = (id: number): string => LEADERBOARD_NAMES[id] ?? 'UNR';

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
          <Box w="100%" overflowX="auto">
            <Table size="xs" variant="simple" w="100%">
              <Thead>
                <Tr>
                  <Th width={layout?.profileHeader.table.boardWidth} fontSize="2xs" whiteSpace="nowrap" textOverflow="ellipsis" overflow="hidden">Board</Th>
                  <Th width={layout?.profileHeader.table.rankWidth} fontSize="2xs" textAlign="center">Rank</Th>
                  <Th isNumeric width={layout?.profileHeader.table.ratingWidth} fontSize="2xs">Rating</Th>
                  <Th isNumeric width={layout?.profileHeader.table.maxWidth} fontSize="2xs">Max</Th>
                  <Th width={layout?.profileHeader.table.changeWidth} fontSize="2xs" textAlign="right">Diff</Th>
                </Tr>
              </Thead>
              <Tbody>
                {validLeaderboardStats.map((stat) => {
                  const percentile = stat.rank === -1 ? 0 : (100 - (stat.rank / stat.ranktotal * 100)).toFixed(1);
                  return (
                    <Tr key={stat.leaderboard_id}>
                      <Td fontSize="xs" whiteSpace="nowrap" textOverflow="ellipsis" overflow="hidden">{getLeaderboardName(stat.leaderboard_id)}</Td>
                      <Td isNumeric fontSize="xs">
                        {stat.rank === -1 ? '' : (
                          <HStack spacing={1} justify="flex-end">
                            <Text color="blue.600">{stat.rank}</Text>
                            <Text color="teal.500" fontSize="2xs">({percentile}%)</Text>
                          </HStack>
                        )}
                      </Td>
                      <Td isNumeric fontSize="xs">{stat.rating}</Td>
                      <Td isNumeric fontSize="xs">{stat.highestrating || '-'}</Td>
                      <Td isNumeric fontSize="xs" textAlign="right">
                        {stat.highestrating === 0 ? null : (
                          stat.rating === stat.highestrating ? (
                            <Text fontSize="xs" color="blue.600">=</Text>
                          ) : (
                            <Text fontSize="xs" color="red.600">-{Math.abs(stat.highestrating - stat.rating)}</Text>
                          )
                        )}
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </Box>

          <Divider borderColor="gray.400" opacity={0.8} />

          <Box w="100%" overflowX="auto">
            <Table size="xs" variant="simple" w="100%">
              <Thead>
                <Tr>
                  <Th width={layout?.profileHeader.table.boardWidth} fontSize="2xs" whiteSpace="nowrap" textOverflow="ellipsis" overflow="hidden">Board</Th>
                  <Th isNumeric width={layout?.profileHeader.table.gamesWidth} fontSize="2xs">Games</Th>
                  <Th isNumeric width={layout?.profileHeader.table.wonWidth} fontSize="2xs">Won</Th>
                  <Th isNumeric width={layout?.profileHeader.table.streakWidth} fontSize="2xs">Streak</Th>
                </Tr>
              </Thead>
              <Tbody>
                {validLeaderboardStats.map((stat) => {
                  const totalGames = stat.wins + stat.losses;
                  const winRate = totalGames > 0 ? (stat.wins / totalGames * 100).toFixed(2) : '0.00';
                  return (
                    <Tr key={stat.leaderboard_id}>
                      <Td fontSize="xs" whiteSpace="nowrap" textOverflow="ellipsis" overflow="hidden">{getLeaderboardName(stat.leaderboard_id)}</Td>
                      <Td isNumeric fontSize="xs">{totalGames}</Td>
                      <Td isNumeric fontSize="xs">{winRate}%</Td>
                      <Td isNumeric fontSize="xs">
                        {stat.streak > 0 ? (
                          <Text color="green.500">+{stat.streak}</Text>
                        ) : stat.streak < 0 ? (
                          <Text color="red.500">{stat.streak}</Text>
                        ) : (
                          stat.streak
                        )}
                      </Td>
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