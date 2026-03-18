import { Box, VStack, Card, Flex, SimpleGrid, useBreakpointValue } from '@chakra-ui/react';
import { cardVariant } from '../../types/chakra-overrides';
import type { Match, Player } from '../../types/match';
import { PlayerAvatar } from './PlayerAvatar';
import { MapCard } from './MapCard';
import { MatchDetails } from './MatchDetails';

interface FullMatchSummaryCardProps {
  match: Match;
}

export function FullMatchSummaryCard({ match }: FullMatchSummaryCardProps) {
  const isMobile = useBreakpointValue({ base: true, md: false });

  return (
    <Card.Root variant={cardVariant('match')} w="100%" p={6} bg="brand.sessionCardBg" borderColor="brand.slateBorder" borderWidth="1px" data-testid="enlarged-match-card">
      <VStack gap={6} align="stretch">
        {/* Match Details */}
        <MatchDetails match={match} />

        {/* Main Content */}
        <Flex
          direction={{ base: 'column', lg: 'row' }}
          gap={{ base: 6, lg: 4 }}
          align="stretch"
          justify="space-between"
          data-testid="match-card-content"
        >
          {/* Left: Map */}
          <Box flex="0 0 auto" alignSelf="center">
            <MapCard match={match} />
          </Box>

          {/* Right: Teams and Players */}
          <VStack flex="1" align="stretch" gap={4}>
            {match.teams && match.teams.length > 0 && (
              <VStack gap={4} align="stretch">
                {match.teams.map((team: Player[], teamIndex: number) => {
                  const isWinner = match.winning_teams?.includes(teamIndex + 1) || match.winning_team === teamIndex + 1;

                  return (
                    <Card.Root
                      key={teamIndex}
                      variant={cardVariant(isWinner ? 'winner' : 'loser')}
                      p={{ base: 1, md: 2 }}
                      position="relative"
                      data-testid="team-card"
                    >
                      {isWinner && (
                        <Box position="absolute" top="-16px" right="-12px" zIndex={1} fontSize="3xl" data-testid="trophy-box">
                          🏆
                        </Box>
                      )}
                      {/* Dynamic column layout based on team size */}
                      <SimpleGrid
                        gap={{ base: 1, md: team.length >= 4 ? 1 : 2, lg: team.length >= 4 ? 1 : 2 }}
                        templateColumns={{
                          base: `repeat(${Math.min(team.length, 2)}, minmax(0, 1fr))`,
                          md: `repeat(${Math.min(team.length, 4)}, minmax(0, 1fr))`,
                          lg: `repeat(${Math.min(team.length, 4)}, minmax(0, 1fr))`,
                        }}
                        justifyItems={team.length <= 2 ? 'center' : 'stretch'}
                      >
                        {team.map((player, playerIndex) => {
                          // Alternating background color logic
                          const colCount = isMobile ? 2 : 4;
                          const row = Math.floor(playerIndex / colCount);
                          const col = playerIndex % colCount;
                          const isEven = (row + col) % 2 === 0;
                          const bg = isEven ? 'brand.cardBg' : 'brand.stoneLight';
                          return (
                            <Box
                              key={playerIndex}
                              w="100%"
                              h="100%"
                              bg={bg}
                              borderRadius="md"
                              p={0}
                              display="flex"
                              alignItems="center"
                              justifyContent="center"
                            >
                              <Box
                                w="100%"
                                maxW={{ base: '120px', md: '140px' }}
                                mx="auto"
                                py={2}
                                px={1}
                              >
                                <PlayerAvatar player={player} matchId={match.match_id} />
                              </Box>
                            </Box>
                          );
                        })}
                      </SimpleGrid>
                    </Card.Root>
                  );
                })}
              </VStack>
            )}
          </VStack>
        </Flex>
      </VStack>
    </Card.Root>
  );
}
