import { Box, VStack, Card, Flex, Text } from '@chakra-ui/react';
import { cardVariant } from '../../types/chakra-overrides';
import type { Match, Player } from '../../types/match';
import { PlayerAvatar } from './PlayerAvatar';
import { MapCard } from './MapCard';
import { MatchDetails } from './MatchDetails';

interface FullMatchSummaryCardProps {
  match: Match;
}

function TeamColumn({
  team,
  isWinner,
  matchId,
  teamSize,
}: {
  team: Player[];
  isWinner: boolean;
  matchId: string;
  teamSize: number;
}) {
  const playerGap = teamSize <= 1 ? 5 : teamSize <= 2 ? 4 : 2;
  const playerPy = teamSize <= 1 ? 3 : teamSize <= 2 ? 2 : 1;

  return (
    <VStack
      align="stretch"
      gap={playerGap}
      flex="1"
      px={3}
      py={2}
      bg={isWinner ? 'brand.cardWinnerBg' : 'brand.cardLoserBg'}
      borderTop="2px solid"
      borderTopColor={isWinner ? 'brand.redChalk' : 'transparent'}
      borderRadius="sm"
    >
      {/* Team result label */}
      <Box>
        {isWinner ? (
          <Text
            fontSize="sm"
            fontWeight="semibold"
            fontStyle="italic"
            color="brand.redChalk"
            data-testid="victory-label"
          >
            <Text as="span" fontSize="xs" mr={1}>&#x2726;</Text>
            Victory
          </Text>
        ) : (
          <Text
            fontSize="2xs"
            fontWeight="semibold"
            letterSpacing="wider"
            textTransform="uppercase"
            color="brand.inkMuted"
            data-testid="victory-label"
          >
            Defeat
          </Text>
        )}
        {isWinner && (
          <Box h="2px" bg="brand.redChalk" w="60px" mt={1} />
        )}
      </Box>

      {/* Player list */}
      {team.map((player, i) => (
        <Box key={i} py={playerPy}>
          <PlayerAvatar player={player} matchId={matchId} teamSize={teamSize} />
        </Box>
      ))}

      {/* End-of-section terminal ornament */}
      <Box display="flex" justifyContent="center" pt={1}>
        <Box
          w="4px"
          h="4px"
          bg={isWinner ? 'brand.redChalk' : 'brand.inkLight'}
          transform="rotate(45deg)"
        />
      </Box>
    </VStack>
  );
}

export function FullMatchSummaryCard({ match }: FullMatchSummaryCardProps) {
  const teamSize = match.teams?.length
    ? Math.max(...match.teams.map((t) => t.length))
    : 1;

  return (
    <Card.Root variant={cardVariant('match')} w="100%" p={6} data-testid="enlarged-match-card">
      <VStack gap={6} align="stretch">
        {/* Match Details */}
        <MatchDetails match={match} />

        {/* Decorative section divider — manuscript double-rule with red chalk diamond */}
        <Box position="relative" w="full" py={1}>
          <Box h="1px" bg="brand.inkLight" w="full" />
          <Box h="1px" bg="brand.inkLight" w="full" mt="4px" />
          <Box
            position="absolute"
            top="50%"
            left="50%"
            transform="translate(-50%, -50%) rotate(45deg)"
            w="6px"
            h="6px"
            bg="brand.redChalk"
          />
        </Box>

        {/* Main Content: Team 1 | Map/VS | Team 2 */}
        <Flex
          direction={{ base: 'column', md: 'row' }}
          gap={{ base: 6, md: 6 }}
          align="stretch"
          data-testid="match-card-content"
        >
          {/* Team 1 — left side */}
          {match.teams && match.teams.length > 0 && (
            <TeamColumn
              team={match.teams[0]}
              isWinner={
                match.winning_teams?.includes(1) || match.winning_team === 1
              }
              matchId={match.match_id}
              teamSize={teamSize}
            />
          )}

          {/* Vertical ruled margin — left of center */}
          <Box
            display={{ base: 'none', md: 'block' }}
            w="1px"
            alignSelf="stretch"
            bg="brand.inkLight"
            flexShrink={0}
          />

          {/* Center: Map */}
          <VStack flex="0 0 auto" align="center" px={{ base: 0, md: 4 }}>
            <MapCard match={match} />
            <Text
              fontSize="xs"
              fontWeight="bold"
              color="brand.inkMuted"
              letterSpacing="wider"
              textTransform="uppercase"
            >
              vs
            </Text>
          </VStack>

          {/* Vertical ruled margin — right of center */}
          <Box
            display={{ base: 'none', md: 'block' }}
            w="1px"
            alignSelf="stretch"
            bg="brand.inkLight"
            flexShrink={0}
          />

          {/* Team 2 — right side */}
          {match.teams && match.teams.length > 1 && (
            <TeamColumn
              team={match.teams[1]}
              isWinner={
                match.winning_teams?.includes(2) || match.winning_team === 2
              }
              matchId={match.match_id}
              teamSize={teamSize}
            />
          )}
        </Flex>
      </VStack>
    </Card.Root>
  );
}
