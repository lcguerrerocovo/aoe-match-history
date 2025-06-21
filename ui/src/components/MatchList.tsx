import { Box, VStack, Text, Link, HStack, Divider, Tooltip, Accordion, AccordionItem, AccordionButton, AccordionPanel, AccordionIcon, Card } from '@chakra-ui/react';
import type { MatchGroup } from '../types/match';
import { ExternalLinkIcon, TimeIcon, CalendarIcon } from '@chakra-ui/icons';
import { PLAYER_COLORS } from './playerColors';
import { Link as RouterLink } from 'react-router-dom';
import { useLayoutConfig } from '../theme/breakpoints';
import { parseDuration } from '../utils/durationUtils';
import { sumDurations, countByDiplomacy, formatDuration, formatDateTime, formatDayDate } from '../utils/matchUtils';

const BASE_URL = import.meta.env.PROD ? 'https://aoe2.site' : window.location.origin;

const PROFILE_ID = 4764337;

interface MatchListProps {
  matchGroups: MatchGroup[];
  openDates: string[];
  onOpenDatesChange: (dates: string[]) => void;
}

function MapCard({ match }: { match: any }) {
  const layout = useLayoutConfig();
  const mapName = match.map || '';
  const imageUrl = `https://storage.googleapis.com/aoe2.site/assets/maps/${mapName}.png`;

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minW={layout?.mapCard.minWidth}
      maxW={layout?.mapCard.maxWidth}
      p={layout?.mapCard.padding}
      mb={layout?.mapCard.marginBottom}
      mx="auto"
    >
      {/* Diamond-shaped map image */}
      <Box
        w={layout?.mapCard.diamondSize}
        h={layout?.mapCard.diamondSize}
        bg="white"
        borderRadius="md"
        display="flex"
        alignItems="center"
        justifyContent="center"
        fontSize="xs"
        fontWeight="bold"
        transform="rotate(45deg)"
        mb={2}
        overflow="visible"
        border="none"
        boxShadow="0 0 2px rgba(0,0,0,0.04)"
      >
        <Box transform="rotate(-45deg)" w={layout?.mapCard.diamondSize} h={layout?.mapCard.diamondSize} overflow="hidden">
          <img
            src={imageUrl}
            alt={mapName}
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6 }}
          />
        </Box>
      </Box>
      {/* Map name below image */}
      <Box mt={1} textAlign="center" fontSize="xs">
        <Text as="span">{mapName}</Text>
      </Box>
    </Box>
  );
}

function MatchSummaryCard({ match, BASE_URL }: { match: any; BASE_URL: string }) {
  const layout = useLayoutConfig();
  const durationSec = parseDuration(match.duration);
  const realTimeSec = Math.round(durationSec / 1.7);


  return (
    <Card variant="summary" w="100%" mb={1} p={1} fontSize="sm">
      <VStack spacing={0.5} align="stretch">
        <HStack justify="space-between" spacing={2} wrap="wrap">
          <Text fontWeight="bold">#{match.match_id}</Text>
          <Text>{match.description}</Text>
          <Link
            href={`${BASE_URL}/site/matches/${match.match_id}/match.html`}
            color="blue.500"
            fontWeight="semibold"
            isExternal
          >
            APM Charts <ExternalLinkIcon mx="2px" />
          </Link>
        </HStack>
        <Divider />
        <Box
          display="flex"
          flexDirection={layout?.matchCard.flexDirection}
          gap={layout?.matchCard.gap}
          alignItems={layout?.matchCard.alignItems}
          justifyContent={layout?.matchCard.justifyContent}
        >
          <HStack spacing={1}>
            <CalendarIcon boxSize={3} />
            <Text as="span" color="gray.600">
              {formatDateTime(match.start_time)}
            </Text>
          </HStack>
          <HStack spacing={2}>
            <HStack spacing={1}>
              <TimeIcon boxSize={3} color="blue.400" />
              <Text as="span" color="gray.600">
                Game: {formatDuration(durationSec)}
              </Text>
            </HStack>
            <HStack spacing={1}>
              <TimeIcon boxSize={3} color="orange.400" />
              <Tooltip label="Real time (1.7x game time)" fontSize="xs">
                <Text as="span" color="gray.600">
                  Real: {formatDuration(realTimeSec)}
                </Text>
              </Tooltip>
            </HStack>
          </HStack>
        </Box>
      </VStack>
    </Card>
  );
}

function TeamCard({ match }: { match: any }) {
  const layout = useLayoutConfig();
  const is1v1 = match.diplomacy?.type === '1v1';

  return (
    <Box width={layout?.teamCard.width}>
      <Box
        display="flex"
        flexDirection={layout?.teamCard.flexDirection}
        gap={layout?.teamCard.gap}
        width="100%"
        justifyContent="center"
      >
        {Array.isArray(match.teams) &&
          match.teams.map((team: any[], idx: number) => {
            const isWinner = match.winning_team === idx + 1;
            return (
              <Card
                key={idx}
                variant={isWinner ? 'winner' : 'loser'}
                flex="1"
                minW="0"
                overflow="hidden"
              >
                {isWinner && (
                  <Box position="absolute" top={1} right={1} zIndex={1}>
                    🏆
                  </Box>
                )}
                <VStack spacing={layout?.teamCard.teamVStackSpacing} align={layout?.teamCard.teamVStackAlign} width={layout?.teamCard.teamVStackWidth}>
                  {team.map((p, rowIndex) => (
                    <Box
                      key={p.name}
                      display="flex"
                      alignItems="center"
                      borderWidth="1px"
                      borderColor="brand.stone"
                      borderRadius="sm"
                      p={0.5}
                      bg={rowIndex % 2 === 0 ? 'white' : 'brand.stoneLight'}
                      minW={layout?.teamCard.playerBoxMinWidth}
                      maxW={layout?.teamCard.playerBoxMaxWidth}
                      flex={layout?.teamCard.playerBoxFlex}
                      m={0}
                    >
                      <Box
                        w={layout?.teamCard.colorBarWidth}
                        h={layout?.teamCard.colorBarHeight}
                        bg={PLAYER_COLORS[p.color_id] || 'gray.400'}
                        borderRadius="sm"
                        mr={1}
                        flexShrink={0}
                      />
                      <Box
                        position="relative"
                        w={layout?.teamCard.civIconSize}
                        h={layout?.teamCard.civIconSize}
                        bg="gray.300"
                        borderRadius="sm"
                        mr={1}
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        flexShrink={0}
                      >
                        <Text
                          position="absolute"
                          top={0}
                          left="50%"
                          transform="translateX(-50%)"
                          fontSize={layout?.teamCard.civFontSize}
                          fontWeight="bold"
                          color="gray.700"
                          zIndex={1}
                        >
                          {(typeof p.civ === 'string' ? p.civ : '???').slice(0, 3).toUpperCase()}
                        </Text>
                      </Box>
                      <RouterLink 
                        to={`/profile_id/${p.user_id.toString()}`}
                        style={{
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          maxWidth: is1v1 ? layout?.teamCard.playerNameMaxWidth1v1 : layout?.teamCard.playerNameMaxWidthTeam,
                          display: 'inline-block',
                          cursor: 'pointer',
                          color: 'blue.500',
                          textDecoration: 'none',
                          fontSize: layout?.teamCard.playerNameFontSize
                        }}
                      >
                        {p.name}
                      </RouterLink>
                      {is1v1 && p.rate_snapshot !== undefined && p.rate_snapshot !== null && (
                        <Text
                          as="span"
                          fontSize={layout?.teamCard.ratingFontSize}
                          color="gray.500"
                          ml={0.5}
                          minW={layout?.teamCard.ratingMinWidth}
                          textAlign="right"
                          flexShrink={0}
                        >
                          {p.rate_snapshot}
                        </Text>
                      )}
                    </Box>
                  ))}
                </VStack>
              </Card>
            );
          })}
      </Box>
    </Box>
  );
}

export function MatchCard({ match, BASE_URL }: { match: any; BASE_URL: string }) {
  const layout = useLayoutConfig();

  return (
    <Card variant="match" role="group">
      <MatchSummaryCard match={match} BASE_URL={BASE_URL} />
      <Box
        display="flex"
        flexDirection={layout?.matchCard.flexDirection}
        gap={layout?.matchCard.gap}
        alignItems={layout?.matchCard.alignItems}
        justifyContent={layout?.matchCard.justifyContent}
        width="100%"
        mt={2}
        data-testid="match-card-content"
      >
        <MapCard match={match} />
        <TeamCard match={match} />
      </Box>
    </Card>
  );
}

export function MatchList({ matchGroups, openDates, onOpenDatesChange }: MatchListProps) {
  const layout = useLayoutConfig();

  return (
    <Box w={layout?.matchList.width} maxWidth={layout?.matchList.maxWidth} overflow={layout?.matchList.overflow}>
      <Accordion
        allowMultiple
        index={matchGroups
          .map((group, index) => (openDates.includes(group.date) ? index : -1))
          .filter((index) => index !== -1)}
        onChange={(indexes: number[]) => onOpenDatesChange(indexes.map((i) => matchGroups[i].date))}
        w={layout?.matchList.accordionWidth}
        mx="auto"
        variant="filled"
      >
        {matchGroups.map((group) => {
          const { totalGame, totalReal } = sumDurations(group.matches);
          const byDiplo = countByDiplomacy(group.matches, PROFILE_ID.toString());
          return (
            <AccordionItem key={group.date}>
              <h2>
                <AccordionButton>
                  <VStack flex="1" align="stretch" spacing={2}>
                    {/* Date Header */}
                    <Box bg="brand.stoneLight" p={2} borderRadius="md" borderWidth="1px" borderColor="brand.heraldic">
                      <Text fontWeight="bold" fontSize="lg" letterSpacing="wide" color="brand.black">
                        {formatDayDate(group.date)}
                      </Text>
                    </Box>
                    
                    {/* Match Stats Row */}
                    <HStack spacing={2} wrap="wrap">
                      <Box bg="brand.parchment" color="brand.black" px={3} py={1} borderRadius="full" fontSize="sm" fontWeight="bold">
                        <Text as="span">Matches: </Text>
                        <Text as="span">{group.matches.length}</Text>
                      </Box>
                      {Object.entries(byDiplo).map(([diplo, rec]) => (
                        <Box
                          key={diplo}
                          bg="brand.stone"
                          color="brand.black"
                          px={3}
                          py={1}
                          borderRadius="full"
                          fontSize="sm"
                          fontWeight="semibold"
                        >
                          <Text as="span" fontWeight="bold" mr={2}>{diplo}</Text>
                          <Text as="span" color="brand.win" mr={1}>{rec.wins}W</Text>
                          <Text as="span" color="brand.loss">{rec.losses}L</Text>
                          {rec.uncategorized > 0 && (
                            <Text as="span" color="gray.500" ml={1}>{rec.uncategorized}?</Text>
                          )}
                        </Box>
                      ))}
                    </HStack>

                    {/* Time Stats Row */}
                    <HStack spacing={4} fontSize="sm" color="brand.steel">
                      <HStack spacing={1}>
                        <TimeIcon color="brand.same" />
                        <Text>Game Time:</Text>
                        <Text fontWeight="bold">{formatDuration(totalGame)}</Text>
                      </HStack>
                      <HStack spacing={1}>
                        <TimeIcon color="brand.bronze" />
                        <Text>Real Time:</Text>
                        <Text fontWeight="bold">{formatDuration(totalReal)}</Text>
                      </HStack>
                    </HStack>
                  </VStack>
                  <AccordionIcon />
                </AccordionButton>
              </h2>
              <AccordionPanel pb={4}>
                <VStack spacing={layout?.matchList.groupGap} align="stretch" width="100%" mx="auto">
                  {group.matches.map((match) => (
                    <Box
                      key={match.match_id}
                      minH={layout?.matchList.groupMinHeight}
                      width={layout?.matchList.matchWidth}
                      mx="auto"
                      display="flex"
                      flexDirection="column"
                    >
                      <MatchCard match={match} BASE_URL={BASE_URL} />
                    </Box>
                  ))}
                </VStack>
              </AccordionPanel>
            </AccordionItem>
          );
        })}
      </Accordion>
    </Box>
  );
}
