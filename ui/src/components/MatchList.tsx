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
        w="75px"
        h="75px"
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
        border="0.1px solid #f7fafc"
        boxShadow="0 0.1px 0.1px 0 rgba(0,0,0,0.02)"
      >
        <Box transform="rotate(-45deg)" w="75px" h="75px" overflow="hidden">
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
              <Box
                key={idx}
                position="relative"
                borderWidth={isWinner ? '2px' : '1px'}
                borderColor={isWinner ? 'gold' : 'gray.200'}
                borderRadius="md"
                p={1}
                minW={layout?.teamCard.minWidth}
                bg="white"
                boxShadow={isWinner ? '0 0 8px gold' : undefined}
                flex="1"
                display="flex"
                flexDirection="column"
                alignItems="stretch"
                justifyContent="flex-start"
              >
                {isWinner && (
                  <Box position="absolute" top={1} right={1} zIndex={1}>
                    🏆
                  </Box>
                )}
                <VStack spacing={0} align="stretch" width="100%">
                  {team.map((p) => (
                    <Box
                      key={p.name}
                      display="flex"
                      alignItems="center"
                      borderWidth="1px"
                      borderColor="gray.100"
                      borderRadius="sm"
                      p={0.5}
                      bg="gray.50"
                      minW={layout?.teamCard.playerBoxMinWidth}
                      maxW="100%"
                      m={0}
                    >
                      <Box
                        w="8px"
                        h="16px"
                        bg={PLAYER_COLORS[p.color_id] || 'gray.400'}
                        borderRadius="sm"
                        mr={1}
                        flexShrink={0}
                      />
                      <Box
                        position="relative"
                        w="21px"
                        h="21px"
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
                          fontSize="9px"
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
                          maxWidth: is1v1 ? '90px' : '130px',
                          display: 'inline-block',
                          cursor: 'pointer',
                          color: 'blue.500',
                          textDecoration: 'none',
                          fontSize: '12px'
                        }}
                      >
                        {p.name}
                      </RouterLink>
                      {is1v1 && p.rate_snapshot !== undefined && p.rate_snapshot !== null && (
                        <Text
                          as="span"
                          fontSize="12px"
                          color="gray.500"
                          ml={0.5}
                          minW="22px"
                          textAlign="right"
                          flexShrink={0}
                        >
                          {p.rate_snapshot}
                        </Text>
                      )}
                    </Box>
                  ))}
                </VStack>
              </Box>
            );
          })}
      </Box>
    </Box>
  );
}

export function MatchCard({ match, BASE_URL }: { match: any; BASE_URL: string }) {
  return (
    <Card variant="match">
      <MatchSummaryCard match={match} BASE_URL={BASE_URL} />
      <Box
        role="group"
        display="flex"
        flexDirection={{ base: 'column', md: 'row' }}
        gap={{ base: '1rem', md: '1rem', xl: '2rem' }}
        alignItems={{ base: 'flex-start', md: 'center' }}
        justifyContent="space-between"
        width="100%"
      >
        <MapCard match={match} />
        <Box flex="1" width="100%">
          <TeamCard match={match} />
        </Box>
      </Box>
    </Card>
  );
}

export function MatchList({ matchGroups, openDates, onOpenDatesChange }: MatchListProps) {
  const layout = useLayoutConfig();

  return (
    <Box w={layout?.matchList.width} maxW={layout?.matchList.maxWidth} overflow={layout?.matchList.overflow}>
      <Accordion
        allowMultiple
        index={matchGroups
          .map((group, index) => (openDates.includes(group.date) ? index : -1))
          .filter((index) => index !== -1)}
        onChange={(indexes: number[]) => onOpenDatesChange(indexes.map((i) => matchGroups[i].date))}
        width={layout?.matchList.accordionWidth}
        mx="auto"
      >
        {matchGroups.map((group) => {
          const { totalGame, totalReal } = sumDurations(group.matches);
          const byDiplo = countByDiplomacy(group.matches, PROFILE_ID.toString());
          return (
            <AccordionItem key={group.date}>
              <h2>
                <AccordionButton>
                  <Box
                    flex="1"
                    textAlign="left"
                    display="flex"
                    flexDirection="column"
                    alignItems="stretch"
                    width={layout?.matchList.groupWidth}
                  >
                    <Box
                      fontWeight="bold"
                      fontSize="xl"
                      mb={2}
                      letterSpacing="wide"
                      px={2}
                      py={1}
                      borderRadius="md"
                      border="1px solid #e2e8f0"
                      bg="gray.50"
                      width="100%"
                    >
                      <span title={group.date}>{formatDayDate(group.date)}</span>
                    </Box>
                    <Box
                      display="flex"
                      flexDirection={layout?.matchCard.flexDirection}
                      gap={layout?.matchCard.gap}
                      alignItems={layout?.matchCard.alignItems}
                      mb={1}
                      width="100%"
                      flexWrap="wrap"
                    >
                      <Box
                        px={2}
                        py={0.5}
                        borderRadius="md"
                        bg="blue.100"
                        minW={{ base: '100%', md: '90px' }}
                        justifyContent="center"
                        fontSize="sm"
                        fontWeight="semibold"
                        display="flex"
                        alignItems="center"
                      >
                        <Text as="span" fontWeight="bold">
                          Matches
                        </Text>
                        <Text as="span" ml={1}>
                          {group.matches.length}
                        </Text>
                      </Box>
                      {Object.entries(byDiplo).map(([diplo, rec]) => (
                        <Box
                          key={diplo}
                          display="flex"
                          alignItems="center"
                          gap={1}
                          px={2}
                          py={0.5}
                          borderRadius="md"
                          bg="gray.100"
                          minW={{ base: '100%', md: '120px' }}
                          justifyContent="center"
                          fontSize="sm"
                          fontWeight="semibold"
                        >
                          <Text as="span" fontWeight="bold">
                            {diplo}
                          </Text>
                          <Text as="span" color="green.600">
                            {rec.wins}W
                          </Text>
                          <Text as="span" color="red.600">
                            {rec.losses}L
                          </Text>
                          {rec.uncategorized > 0 && (
                            <Text as="span" color="gray.500">
                              {rec.uncategorized}?
                            </Text>
                          )}
                        </Box>
                      ))}
                    </Box>
                    <Box
                      display="flex"
                      flexDirection={layout?.matchCard.flexDirection}
                      gap={layout?.matchCard.gap}
                      alignItems={layout?.matchCard.alignItems}
                      mb={0.5}
                      width="100%"
                    >
                      <Box
                        fontSize="sm"
                        color="gray.600"
                        display="flex"
                        alignItems="center"
                        gap={1}
                      >
                        <TimeIcon boxSize={3} color="blue.400" />
                        <Text as="span">Game Time:</Text>
                        <Text as="span" fontWeight="bold">
                          {formatDuration(totalGame)}
                        </Text>
                      </Box>
                      <Box
                        fontSize="sm"
                        color="gray.600"
                        display="flex"
                        alignItems="center"
                        gap={1}
                      >
                        <TimeIcon boxSize={3} color="orange.400" />
                        <Text as="span">Real Time:</Text>
                        <Text as="span" fontWeight="bold">
                          {formatDuration(totalReal)}
                        </Text>
                      </Box>
                    </Box>
                  </Box>
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
