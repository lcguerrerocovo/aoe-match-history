import { Box, Text, VStack, Divider, Icon, Table, Thead, Tbody, Tr, Th, Td, Avatar, useMultiStyleConfig } from '@chakra-ui/react';
import { FaUser } from 'react-icons/fa';
import type { PersonalStats, LeaderboardStats } from '../types/stats';
import { getLeaderboardName } from '../utils/leaderboardUtils';

interface ProfileHeaderProps {
  profileId: string;
  profile: { id: string; name: string; avatarUrl?: string } | null;
  stats: PersonalStats | null;
  isLoading: boolean;
}

export function ProfileHeader({ profileId, profile, stats, isLoading }: ProfileHeaderProps) {
  const playerName = isLoading ? 'Loading...' : profile?.name ?? profileId;
  const styles = useMultiStyleConfig('ProfileHeader', {});
  const leaderboardStats = stats?.leaderboardStats || [];

  // Filter out any leaderboard stats with invalid data
  const validLeaderboardStats = leaderboardStats.filter((stat: LeaderboardStats) => 
    stat && typeof stat.leaderboard_id === 'number' && 
    typeof stat.rating === 'number' && 
    typeof stat.rank === 'number'
  );

  return (
    <Box sx={styles.container}>
      <VStack spacing={2} align="stretch">
        {/* Profile Section */}
        <VStack spacing={2} align="center" pb={2}>
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
          <VStack spacing={1}>
            <Text sx={styles.name} textAlign="center" noOfLines={2}>{playerName}</Text>
            <Text sx={styles.id}>ID: {profileId}</Text>
          </VStack>
        </VStack>

        <Divider />

        {/* Stats Section */}
        <VStack spacing={1} align="stretch" sx={styles.statsTable}>
          <Box w="100%" overflowX="auto">
            <Table size="xs" variant="simple" w="100%">
              <Thead>
                <Tr>
                  <Th>Board</Th>
                  <Th isNumeric>Rank</Th>
                  <Th isNumeric>Top %</Th>
                  <Th isNumeric>Rating</Th>
                  <Th isNumeric>Max</Th>
                  <Th textAlign="right">Diff</Th>
                </Tr>
              </Thead>
              <Tbody>
                {validLeaderboardStats.map((stat) => {
                  const percentile = stat.rank === -1 ? 0 : (stat.rank / stat.ranktotal * 100).toFixed(1);
                  return (
                    <Tr key={stat.leaderboard_id}>
                      <Td>{getLeaderboardName(stat.leaderboard_id)}</Td>
                      <Td isNumeric>
                        <Text className="rank">{stat.rank === -1 ? '' : stat.rank}</Text>
                      </Td>
                      <Td isNumeric>
                        <Text className="percentile" fontWeight="900">{stat.rank === -1 ? '' : percentile}</Text>
                      </Td>
                      <Td isNumeric>{stat.rating}</Td>
                      <Td isNumeric>{stat.highestrating || '-'}</Td>
                      <Td textAlign="right">
                        {stat.highestrating === 0 ? null : (
                          stat.rating === stat.highestrating ? (
                            <Text as="span" className="rank">=</Text>
                          ) : (
                            <Text as="span" className="loss">-{Math.abs(stat.highestrating - stat.rating)}</Text>
                          )
                        )}
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </Box>

          <Divider opacity={0.8} />

          <Box w="100%" overflowX="auto">
            <Table size="xs" variant="simple" w="100%">
              <Thead>
                <Tr>
                  <Th>Board</Th>
                  <Th isNumeric>Games</Th>
                  <Th isNumeric>Won</Th>
                  <Th isNumeric>Streak</Th>
                </Tr>
              </Thead>
              <Tbody>
                {validLeaderboardStats.map((stat) => {
                  const totalGames = stat.wins + stat.losses;
                  const winRate = totalGames > 0 ? (stat.wins / totalGames * 100).toFixed(2) : '0.00';
                  return (
                    <Tr key={stat.leaderboard_id}>
                      <Td>{getLeaderboardName(stat.leaderboard_id)}</Td>
                      <Td isNumeric>{totalGames}</Td>
                      <Td isNumeric>{winRate}%</Td>
                      <Td isNumeric>
                        {stat.streak > 0 ? (
                          <Text as="span" className="streak">+{stat.streak}</Text>
                        ) : stat.streak < 0 ? (
                          <Text as="span" className="loss">{stat.streak}</Text>
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