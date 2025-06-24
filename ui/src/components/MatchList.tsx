import { Box, VStack, Text, Link, HStack, Divider, Tooltip, Accordion, AccordionItem, AccordionButton, AccordionPanel, AccordionIcon, Card, useBreakpointValue } from '@chakra-ui/react';
import type { MatchGroup, Player } from '../types/match';
import { ExternalLinkIcon, TimeIcon, CalendarIcon } from '@chakra-ui/icons';
import { PLAYER_COLORS } from './playerColors';
import { Link as RouterLink } from 'react-router-dom';
import { useLayoutConfig } from '../theme/breakpoints';
import { parseDuration } from '../utils/timeUtils';
import { sumDurations, countByDiplomacy, formatDuration, formatDateTime, formatSessionStart, calculateSessionDuration } from '../utils/matchUtils';
import { assetManager } from '../utils/assetManager';
import { useState } from 'react';

const BASE_URL = import.meta.env.PROD ? 'https://aoe2.site' : window.location.origin;

interface MatchListProps {
  matchGroups: MatchGroup[];
  openDates: string[];
  onOpenDatesChange: (dates: string[]) => void;
  profileId: string;
}

function PlayerRating({ player }: { player: Player }) {
  const { rating, rating_change: ratingChange } = player;
  const displayMode = useBreakpointValue({ base: 'compact', md: 'full' });

  if (rating == null || ratingChange == null) {
    return null;
  }

  const changeColor = ratingChange > 0 ? 'brand.win' : 'brand.loss';
  const changeText = ratingChange > 0 ? `+${ratingChange}` : ratingChange.toString();

  if (displayMode === 'full') {
    return (
      <HStack spacing={2} ml="auto">
        <Text fontWeight="semibold" fontSize="xs" fontFamily="mono" minWidth="4ch" textAlign="right">
          {rating}
        </Text>
        <Text color={changeColor} fontWeight="semibold" fontSize="xs" fontFamily="mono" minWidth="3ch" textAlign="right">
          {changeText}
        </Text>
      </HStack>
    );
  }

  return (
    <HStack spacing={1} ml="auto">
      <Text fontWeight="semibold" fontSize="xs" fontFamily="mono" minWidth="4ch" textAlign="right">
        {rating}
      </Text>
      <Text color={changeColor} fontWeight="semibold" fontSize="xs" fontFamily="mono">
        ({changeText})
      </Text>
    </HStack>
  );
}

function MapCard({ match }: { match: any }) {
  const layout = useLayoutConfig();
  const mapName = match.map || '';
  const [imageError, setImageError] = useState(false);
  
  const imageUrl = imageError 
    ? assetManager.getGenericMapImage() 
    : assetManager.getMapImage(mapName);

  const handleImageError = () => {
    setImageError(true);
  };

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
        bg="transparent"
        borderRadius="none"
        display="flex"
        alignItems="center"
        justifyContent="center"
        fontSize="xs"
        fontWeight="bold"
        transform="rotate(45deg)"
        mb={2}
        overflow="hidden"
        border="none"
        boxShadow="none"
      >
        <Box transform="rotate(-45deg)" w={layout?.mapCard.diamondSize} h={layout?.mapCard.diamondSize} overflow="hidden" borderRadius="md">
          <img
            src={imageUrl}
            alt={mapName}
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 0 }}
            onError={handleImageError}
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
    <Card variant="summary" w="100%" mb={1} p={1} fontSize={{ base: 'xs', md: 'sm' }}>
      <VStack spacing={0.5} align="stretch">
        <HStack justify="space-between" spacing={2} wrap="wrap">
          <Text fontWeight="bold">#{match.match_id}</Text>
          <Text>{match.description}</Text>
          <Link
            href={`${BASE_URL}/site/matches/${match.match_id}/match.html`}
            color="blue.500"
            fontWeight="semibold"
            isExternal
            display="none"
          >
            APM Charts <ExternalLinkIcon mx="2px" />
          </Link>
          <Tooltip label="Coming Soon!" fontSize="xs" placement="top">
            <Text
              color="gray.400"
              fontWeight="semibold"
              cursor="not-allowed"
            >
              APM Charts
            </Text>
          </Tooltip>
        </HStack>
        <Divider />
        <Box
          display="flex"
          flexDirection={layout?.matchSummaryCard.flexDirection}
          gap={layout?.matchSummaryCard.gap}
          alignItems={layout?.matchSummaryCard.alignItems}
          justifyContent={layout?.matchSummaryCard.justifyContent}
          w={layout?.matchSummaryCard.w}
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
                {formatDuration(durationSec)}
              </Text>
            </HStack>
            <HStack spacing={1}>
              <TimeIcon boxSize={3} color="orange.400" />
              <Tooltip label="Real time (1.7x game time)" fontSize="xs">
                <Text as="span" color="gray.600">
                  {formatDuration(realTimeSec)}
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

  const getPlayerCardPadding = (numPlayers: number) => {
    if (numPlayers <= 1) return 2; // 1v1 gets most padding
    if (numPlayers === 2) return 1.5;
    if (numPlayers === 3) return 1;
    return 0.5; // 4+ players get least padding
  };

  // Helper function to chunk teams into rows based on layout config
  const chunkTeamsIntoRows = (teams: Player[][]) => {
    if (!layout?.teamCard.wrapTeams || !layout?.teamCard.teamsPerRow) {
      return [teams]; // Return single row if wrapping is disabled
    }
    
    const rows = [];
    for (let i = 0; i < teams.length; i += layout.teamCard.teamsPerRow) {
      rows.push(teams.slice(i, i + layout.teamCard.teamsPerRow));
    }
    return rows;
  };

  const teamRows = Array.isArray(match.teams) ? chunkTeamsIntoRows(match.teams) : [];

  const renderTeam = (team: Player[], globalTeamIndex: number) => {
    const isWinner = match.winning_teams?.includes(globalTeamIndex + 1) || match.winning_team === globalTeamIndex + 1;
    const cardPadding = getPlayerCardPadding(team.length);
    
    // Calculate the starting index for this team
    let teamStartIndex = 0;
    for (let i = 0; i < globalTeamIndex; i++) {
      teamStartIndex += match.teams[i].length;
    }
    
    return (
      <Card
        key={globalTeamIndex}
        data-testid="team-card"
        variant={isWinner ? 'winner' : 'loser'}
        flex="1"
        minW="0"
        maxW={layout?.teamCard.teamMaxWidth}
        position="relative"
      >
        {isWinner && (
          <Box position="absolute" top="-12px" right="-10px" zIndex={1} fontSize="xl">
            🏆
          </Box>
        )}
        <VStack
          spacing={layout?.teamCard.teamVStackSpacing}
          align={layout?.teamCard.teamVStackAlign}
          width={layout?.teamCard.teamVStackWidth}
        >
          {Array.isArray(team) && team.map((p: Player, playerIndex: number) => {
            const globalPlayerIndex = teamStartIndex + playerIndex;
            return (
              <Box
                key={p.user_id}
                display="flex"
                alignItems="center"
                borderWidth="1px"
                borderColor="brand.stone"
                borderRadius="sm"
                p={cardPadding}
                bg={globalPlayerIndex % 2 === 0 ? 'white' : 'brand.stoneLight'}
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
                  borderRadius="sm"
                  mr={1}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  flexShrink={0}
                  overflow="hidden"
                >
                  <img
                    src={assetManager.getCivIcon(String(p.civ || 'unknown'))}
                    alt={String(p.civ || 'Unknown')}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      borderRadius: '4px'
                    }}
                    onError={(e) => {
                      // Fallback to text if image fails to load
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const textElement = target.parentElement?.querySelector('.civ-fallback') as HTMLElement;
                      if (textElement) {
                        textElement.style.display = 'block';
                      }
                    }}
                  />
                  <Text
                    className="civ-fallback"
                    position="absolute"
                    top={0}
                    left="50%"
                    transform="translateX(-50%)"
                    fontSize={layout?.teamCard.civFontSize}
                    fontWeight="bold"
                    color="gray.700"
                    zIndex={1}
                    display="none"
                    bg="gray.300"
                    px={1}
                    borderRadius="sm"
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
                <PlayerRating player={p} />
              </Box>
            );
          })}
        </VStack>
      </Card>
    );
  };

  return (
    <Box width={layout?.teamCard.width}>
      <Box
        display="flex"
        flexDirection={layout?.teamCard.wrapTeams ? 'column' : layout?.teamCard.flexDirection}
        gap={layout?.teamCard.gap}
        width="100%"
        justifyContent="center"
      >
        {layout?.teamCard.wrapTeams ? (
          // Wrapped layout: teams in rows
          teamRows.map((row, rowIndex) => (
            <Box
              key={rowIndex}
              data-testid="team-row"
              display="flex"
              flexDirection="row"
              gap={layout?.teamCard.gap}
              width="100%"
              justifyContent="center"
            >
              {row.map((team: Player[], teamIndex: number) => {
                const globalTeamIndex = rowIndex * (layout?.teamCard.teamsPerRow || 2) + teamIndex;
                return renderTeam(team, globalTeamIndex);
              })}
            </Box>
          ))
        ) : (
          // Sequential layout: all teams in one row/column
          Array.isArray(match.teams) &&
            match.teams.map((team: Player[], idx: number) => renderTeam(team, idx))
        )}
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
        mt={{ base: 1, md: 2 }}
        data-testid="match-card-content"
      >
        <MapCard match={match} />
        <TeamCard match={match} />
      </Box>
    </Card>
  );
}

export function MatchList({ matchGroups, openDates, onOpenDatesChange, profileId }: MatchListProps) {
  const layout = useLayoutConfig();
  const sessionDurationLabel = useBreakpointValue({ base: 'Session:', md: 'Session Duration:' });
  const timePlayedLabel = useBreakpointValue({ base: 'Played:', md: 'Time Played:' });

  // Detect if we're in search mode (single group with "Search Results" in the name)
  const isSearchMode = matchGroups.length === 1 && matchGroups[0].date.includes('Search Results');

  // Render matches for a group
  const renderMatches = (matches: any[]) => (
    <VStack spacing={layout?.matchList.groupGap} align="stretch" width="100%" mx="auto">
      {matches.map((match: any) => (
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
  );

  return (
    <Box w={layout?.matchList.width} maxWidth={layout?.matchList.maxWidth} overflow={layout?.matchList.overflow}>
      {isSearchMode ? (
        // Search mode: render matches with same background as accordion
        <Box
          bg="white"
          borderRadius="md"
          borderWidth="1px"
          borderColor="gray.200"
          p={4}
          boxShadow="sm"
        >
          {renderMatches(matchGroups[0].matches)}
        </Box>
      ) : (
        // Normal mode: render with accordion
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
            const { totalReal } = sumDurations(group.matches);
            const sessionDuration = calculateSessionDuration(group.matches);
            const byDiplo = countByDiplomacy(group.matches, profileId);
            return (
              <AccordionItem key={group.date}>
                <h2>
                  <AccordionButton>
                    <VStack flex="1" align="stretch" spacing={2}>
                      {/* Date Header */}
                      <Box bg="brand.stoneLight" p={1} borderRadius="md" borderWidth="1px" borderColor="brand.heraldic">
                        <Text fontWeight="bold" fontSize="md" letterSpacing="wide" color="brand.black">
                          {formatSessionStart(group.date)}
                        </Text>
                      </Box>
                      
                      {/* Match Stats Row */}
                      <HStack justify="space-between" align="center" role="group">
                        <Card variant="matchesCountBubble">
                          <Text as="span">Matches: </Text>
                          <Text as="span">{group.matches.length}</Text>
                        </Card>
                        <HStack spacing={2} wrap="wrap" justify="flex-end">
                          {Object.entries(byDiplo).map(([diplo, rec]) => (
                            <Card key={diplo} variant="recordBubble">
                              <Text as="span" fontWeight="bold" mr={2} display="inline-block" minWidth={{ base: '50px', md: '70px' }} maxWidth={{ base: '60px', md: '120px' }} isTruncated verticalAlign="middle" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                                {diplo}
                              </Text>
                              <Text as="span" color="gray.300" mr={2} verticalAlign="middle">|</Text>
                              <Text as="span" color="brand.brightGreen" mr={1} display="inline-block" minWidth={{ base: '22px', md: '28px' }} verticalAlign="middle">{rec.wins}W</Text>
                              <Text as="span" color="brand.brightRed" display="inline-block" minWidth={{ base: '22px', md: '28px' }} verticalAlign="middle">{rec.losses}L</Text>
                              {rec.uncategorized > 0 && (
                                <Text as="span" color="gray.500" ml={1} verticalAlign="middle">{rec.uncategorized}?</Text>
                              )}
                              {rec.eloChange !== 0 && (
                                <>
                                  <Text as="span" color="gray.300" ml={2} mr={2} verticalAlign="middle">|</Text>
                                  <Text
                                    as="span"
                                    display="inline-block"
                                    minWidth={{ base: '30px', md: '35px' }}
                                    textAlign="right"
                                    fontFamily="mono"
                                    color={rec.eloChange > 0 ? 'brand.brightGreen' : 'brand.brightRed'}
                                    verticalAlign="middle"
                                  >
                                    {rec.eloChange > 0 ? `+${rec.eloChange}` : rec.eloChange}
                                  </Text>
                                </>
                              )}
                            </Card>
                          ))}
                        </HStack>
                      </HStack>

                      {/* Time Stats Row */}
                      <HStack justify="space-between" fontSize="sm" color="brand.steel" role="group">
                        <HStack spacing={1}>
                          <TimeIcon color="brand.bronze" />
                          <Text>{sessionDurationLabel}</Text>
                          <Text fontWeight="bold">{formatDuration(sessionDuration)}</Text>
                        </HStack>
                        <HStack spacing={1}>
                          <TimeIcon color="brand.bronze" />
                          <Text>{timePlayedLabel}</Text>
                          <Text fontWeight="bold">{formatDuration(totalReal)}</Text>
                        </HStack>
                      </HStack>
                    </VStack>
                    <AccordionIcon />
                  </AccordionButton>
                </h2>
                <AccordionPanel pb={4}>
                  {renderMatches(group.matches)}
                </AccordionPanel>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </Box>
  );
}
