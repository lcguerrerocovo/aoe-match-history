import { Box, VStack, Text, Link, HStack, Divider, Tooltip } from '@chakra-ui/react';
import {
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
} from '@chakra-ui/accordion';
import type { MatchGroup } from '../types/match';
import { ExternalLinkIcon, TimeIcon, CalendarIcon } from '@chakra-ui/icons';
import { useEffect, useState } from 'react';
import { getCivMap } from '../services/matchService';
import { useBreakpointValue } from '@chakra-ui/react';
import { PLAYER_COLORS } from './playerColors';

const BASE_URL = import.meta.env.PROD ? 'https://aoe2.site' : window.location.origin;

const PROFILE_ID = 4764337;

interface MatchListProps {
  matchGroups: MatchGroup[];
}

function parseDuration(duration: string | number): number {
  if (typeof duration === 'number') return duration;
  if (typeof duration === 'string' && duration.includes(':')) {
    const parts = duration.split(':').map(Number);
    if (parts.length === 3) {
      // hh:mm:ss
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      // mm:ss
      return parts[0] * 60 + parts[1];
    }
  }
  return 0;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) {
    return `${h}h ${m}m`;
  } else {
    return `${m}m`;
  }
}

function formatDateTime(dt: string): string {
  // Parse UTC timestamp and convert to local time
  const d = new Date(dt);
  if (isNaN(d.getTime())) return dt;
  return d.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  });
}

function formatDayDate(dateStr: string): string {
  // Parse UTC date and format for display
  const d = new Date(dateStr + 'T00:00:00Z');
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function MapCard({ match }: { match: any }) {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minW="80px"
      maxW="120px"
      p={2}
      mb={{ base: 2, md: 0 }}
      mx="auto"
    >
      {/* Diamond-shaped map image placeholder */}
      <Box
        w="60px"
        h="60px"
        bg="gray.200"
        borderRadius="md"
        display="flex"
        alignItems="center"
        justifyContent="center"
        fontSize="xs"
        fontWeight="bold"
        transform="rotate(45deg)"
        mb={2}
      >
        <Box transform="rotate(-45deg)">MAP</Box>
      </Box>
      {/* Map name below image */}
      <Box mt={1} textAlign="center" fontSize="xs">
        <Text as="span">{match.map || ''}</Text>
      </Box>
    </Box>
  );
}

function MatchSummaryCard({ match, BASE_URL }: { match: any; BASE_URL: string }) {
  const durationSec = parseDuration(match.duration);
  const realTimeSec = Math.round(durationSec / 1.7);

  let diplomacyDisplay = match.diplomacy?.type + ' ' + match.diplomacy?.team_size;
  if (match.diplomacy?.type === match.diplomacy?.team_size) {
    diplomacyDisplay = match.diplomacy.type;
  }

  return (
    <Box w="100%" mb={1} p={1} borderWidth="1px" borderRadius="md" bg="gray.50" fontSize="sm">
      <VStack spacing={0.5} align="stretch">
        <HStack justify="space-between" spacing={2} wrap="wrap">
          <Text fontWeight="bold">#{match.match_id}</Text>
          <Text>{diplomacyDisplay}</Text>
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
          flexDirection={{ base: 'column', md: 'row' }}
          gap={{ base: 1, md: 2 }}
          alignItems={{ base: 'flex-start', md: 'center' }}
          justifyContent="space-between"
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
    </Box>
  );
}

function TeamCard({ match, civMap }: { match: any; civMap: Record<string, string> }) {
  const isMobile = useBreakpointValue({ base: true, md: false });
  const is1v1 = match.diplomacy?.type === '1v1';
  return (
    <Box width="100%">
      <Box
        display="flex"
        flexDirection={isMobile ? 'column' : 'row'}
        gap={1}
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
                minW={{ base: '100%', md: '140px' }}
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
                  {team.map((p, _) => (
                    <Box
                      key={p.name}
                      display="flex"
                      alignItems="center"
                      borderWidth="1px"
                      borderColor="gray.100"
                      borderRadius="sm"
                      p={0.5}
                      bg="gray.50"
                      minW={{ base: '0', md: '200px' }}
                      maxW="100%"
                      m={0}
                    >
                      {/* Color strip */}
                      <Box
                        w="8px"
                        h="16px"
                        bg={PLAYER_COLORS[p.color_id] || 'gray.400'}
                        borderRadius="sm"
                        mr={1}
                        flexShrink={0}
                      />
                      {/* Civ image placeholder with abbreviation label */}
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
                          {(civMap[String(p.civ)] || p.civ).slice(0, 3).toUpperCase()}
                        </Text>
                      </Box>
                      {/* Player name and rating (only for 1v1) */}
                      <Text
                        as="span"
                        fontSize="12px"
                        noOfLines={1}
                        style={{
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          maxWidth: is1v1 ? '90px' : '130px',
                          display: 'inline-block',
                        }}
                      >
                        {p.name}
                      </Text>
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

function MatchCard({
  match,
  civMap,
  BASE_URL,
}: {
  match: any;
  civMap: Record<string, string>;
  BASE_URL: string;
}) {
  const isMobile = useBreakpointValue({ base: true, md: false });
  return (
    <Box
      p={4}
      borderWidth="1px"
      borderRadius="lg"
      display="flex"
      flexDirection="column"
      gap={2}
      width="100%"
    >
      <MatchSummaryCard match={match} BASE_URL={BASE_URL} />
      <Box
        display="flex"
        flexDirection={isMobile ? 'column' : 'row'}
        gap={4}
        alignItems={isMobile ? 'flex-start' : 'center'}
        width="100%"
      >
        <MapCard match={match} />
        <Box flex="1" width="100%">
          <TeamCard match={match} civMap={civMap} />
        </Box>
      </Box>
    </Box>
  );
}

export function MatchList({ matchGroups }: MatchListProps) {
  const [civMap, setCivMap] = useState<Record<string, string>>({});
  const [openDates, setOpenDates] = useState<string[]>([]);

  useEffect(() => {
    getCivMap().then(setCivMap);
  }, []);

  // Helper to sum durations for a group
  function sumDurations(matches: any[]) {
    let totalGame = 0;
    let totalReal = 0;
    for (const match of matches) {
      const durationSec = parseDuration(match.duration);
      totalGame += durationSec;
      totalReal += Math.round(durationSec / 1.7);
    }
    return { totalGame, totalReal };
  }

  // Helper to count wins/losses/uncategorized by diplomacy type
  function countByDiplomacy(matches: any[]) {
    const byDiplo: Record<
      string,
      { matches: number; wins: number; losses: number; uncategorized: number }
    > = {};
    for (const match of matches) {
      const diplo = match.diplomacy?.type || 'Unknown';
      if (!byDiplo[diplo]) byDiplo[diplo] = { matches: 0, wins: 0, losses: 0, uncategorized: 0 };
      byDiplo[diplo].matches++;
      let found = false;
      for (const team of match.teams || []) {
        for (const player of team) {
          if (player && player.user_id === PROFILE_ID) {
            if (typeof player.winner === 'boolean') {
              if (player.winner) byDiplo[diplo].wins++;
              else byDiplo[diplo].losses++;
              found = true;
            }
          }
        }
      }
      if (!found) byDiplo[diplo].uncategorized++;
    }
    return byDiplo;
  }

  return (
    <Box w="100%" maxW="100vw" overflow="hidden">
      <Accordion
        allowMultiple
        index={matchGroups
          .map((group, index) => (openDates.includes(group.date) ? index : -1))
          .filter((index) => index !== -1)}
        onChange={(indexes: number[]) => setOpenDates(indexes.map((i) => matchGroups[i].date))}
        width={{ base: '100%', md: '740px' }}
        mx="auto"
      >
        {matchGroups.map((group) => {
          const { totalGame, totalReal } = sumDurations(group.matches);
          const byDiplo = countByDiplomacy(group.matches);
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
                    width={{ base: '100%', md: '740px' }}
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
                      flexDirection={{ base: 'column', md: 'row' }}
                      gap={1}
                      alignItems={{ base: 'stretch', md: 'center' }}
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
                      flexDirection={{ base: 'column', md: 'row' }}
                      gap={2}
                      alignItems={{ base: 'flex-start', md: 'center' }}
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
                <VStack spacing={4} align="stretch" width={{ base: '100%', md: '740px' }} mx="auto">
                  {group.matches.map((match) => (
                    <Box
                      key={match.match_id}
                      minH={{ base: '180px', md: '220px' }}
                      width={{ base: '100%', md: '700px' }}
                      mx="auto"
                      display="flex"
                      flexDirection="column"
                    >
                      <MatchCard match={match} civMap={civMap} BASE_URL={BASE_URL} />
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
