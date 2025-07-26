import { Box, VStack, Text, Link, HStack, Divider, Tooltip, Accordion, AccordionItem, AccordionButton, AccordionPanel, Card, useBreakpointValue, useTheme } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import type { MatchGroup, Player } from '../types/match';
import { TimeIcon, CalendarIcon } from '@chakra-ui/icons';
import { GiBroadsword } from 'react-icons/gi';
import { PLAYER_COLORS } from './playerColors';
import { useLayoutConfig } from '../theme/breakpoints';
import { parseDuration } from '../utils/timeUtils';
import { sumDurations, countByDiplomacy, formatDuration, formatDateTime, formatSessionTimingData } from '../utils/matchUtils';
import { assetManager } from '../utils/assetManager';
import { useState } from 'react';
import { APMGenerator } from './APMGenerator';

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
        <Text fontWeight="semibold" fontSize="xs" fontFamily="mono" minWidth="4ch" textAlign="right" color="brand.midnightBlue">
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
      <Text fontWeight="semibold" fontSize="xs" fontFamily="mono" minWidth="4ch" textAlign="right" color="brand.midnightBlue">
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
        <Text as="span" color="brand.steel">{mapName}</Text>
      </Box>
    </Box>
  );
}

function MatchSummaryCard({ match, profileId, groupOpen }: { match: any; profileId: string; groupOpen: boolean }) {
  const layout = useLayoutConfig();
  const durationSec = parseDuration(match.duration);
  const gameTimeSec = Math.round(durationSec * 1.7);

  return (
    <Card variant="summary" w="100%" mb={1} p={1} fontSize={{ base: 'xs', md: 'sm' }}>
      <VStack spacing={0.5} align="stretch">
        <HStack justify="space-between" spacing={2} wrap="wrap" align="center" minH="32px" py={1}>
          <Link
            as={RouterLink}
            to={`/match/${match.match_id}`}
            fontWeight="bold"
            color="brand.midnightBlue"
            _hover={{ color: "brand.zoolanderBlue", textDecoration: "underline" }}
            textDecoration="none"
          >
            #{match.match_id}
          </Link>
          <Link 
            as={RouterLink}
            to={`/match/${match.match_id}`}
            color="brand.linkDefault"
            fontWeight="semibold"
            _hover={{ color: "brand.linkHover", textDecoration: "underline" }}
          >
            {match.description}
          </Link>
          {/* APM button */}
          {profileId && (
            <Box display="flex" alignItems="center" justifyContent="flex-end">
              <APMButton matchId={match.match_id} profileId={profileId} groupOpen={groupOpen} />
            </Box>
          )}
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
            <CalendarIcon boxSize={3} color="brand.bronze" />
            <Text as="span" color="brand.steel">
              {formatDateTime(match.start_time)}
            </Text>
          </HStack>
          <HStack spacing={2}>
            <HStack spacing={1}>
              <TimeIcon boxSize={3} color="brand.zoolanderBlue" />
              <Tooltip label="Game time (1.7x Real time)" fontSize="xs">
              <Text as="span" color="brand.steel">
                {formatDuration(gameTimeSec)}
              </Text>
              </Tooltip>
            </HStack>
            <HStack spacing={1}>
              <TimeIcon boxSize={3} color="brand.bronze" />
                <Text as="span" color="brand.steel">
                  {formatDuration(durationSec)}
                </Text>
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
                bg={globalPlayerIndex % 2 === 0 ? 'brand.cardBg' : 'brand.stoneLight'}
                minW={layout?.teamCard.playerBoxMinWidth}
                maxW={layout?.teamCard.playerBoxMaxWidth}
                flex={layout?.teamCard.playerBoxFlex}
                m={0}
              >
                <Box
                  w={layout?.teamCard.colorBarWidth}
                  h={layout?.teamCard.colorBarHeight}
                  bg={PLAYER_COLORS[p.color_id] || 'brand.steel'}
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
                    color="brand.bronze"
                    zIndex={1}
                    display="none"
                    bg="brand.stoneLight"
                    px={1}
                    borderRadius="sm"
                  >
                    {(typeof p.civ === 'string' ? p.civ : '???').slice(0, 3).toUpperCase()}
                  </Text>
                </Box>
                <Link
                  as={RouterLink}
                  to={`/profile_id/${p.user_id.toString()}`}
                  color="brand.midnightBlue"
                  fontWeight="semibold"
                  _hover={{ color: "brand.zoolanderBlue", textDecoration: "underline" }}
                  textDecoration="none"
                  fontSize={layout?.teamCard.playerNameFontSize}
                  textOverflow="ellipsis"
                  overflow="hidden"
                  whiteSpace="nowrap"
                  maxWidth={is1v1 ? layout?.teamCard.playerNameMaxWidth1v1 : layout?.teamCard.playerNameMaxWidthTeam}
                  display="inline-block"
                  cursor="pointer"
                >
                  {p.name}
                </Link>
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

function APMButton({ matchId, profileId, groupOpen }: { matchId: string; profileId: string; groupOpen: boolean }) {
  if (!groupOpen) return null;
  
  return (
    <APMGenerator 
      matchId={matchId} 
      profileId={profileId} 
      variant="button" 
    />
  );
}

export function MatchCard({ match, profileId, groupOpen }: { match: any; profileId: string; groupOpen: boolean }) {
  const layout = useLayoutConfig();

  return (
    <Card variant="match" role="group">
      <MatchSummaryCard match={match} profileId={profileId} groupOpen={groupOpen} />
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

interface MatchListProps {
  matchGroups: MatchGroup[];
  openDates: string[];
  onOpenDatesChange: (dates: string[]) => void;
  profileId: string;
}

export function MatchList({ matchGroups, openDates, onOpenDatesChange, profileId }: MatchListProps) {
  const layout = useLayoutConfig();
  const theme = useTheme();

  // Detect if we're in search mode (single group with "Search Results" in the name)
  const isSearchMode = matchGroups.length === 1 && matchGroups[0].date.includes('Search Results');

  // Render matches for a group
  const renderMatches = (matches: any[], groupOpen: boolean) => (
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
          <MatchCard match={match} profileId={profileId} groupOpen={groupOpen} />
        </Box>
      ))}
    </VStack>
  );

  return (
    <Box w={layout?.matchList.width} maxWidth={layout?.matchList.maxWidth} overflow={layout?.matchList.overflow}>
      {isSearchMode ? (
        // Search mode: render matches with same background as accordion
        <Box
          bg="brand.cardBg"
          borderRadius="md"
          borderWidth="1px"
          borderColor="brand.heraldic"
          p={4}
          boxShadow="sm"
        >
          {renderMatches(matchGroups[0].matches, true)}
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
          {matchGroups.map((group: MatchGroup, _idx: number) => {
            const { totalReal } = sumDurations(group.matches);
            const byDiplo = countByDiplomacy(group.matches, profileId);
            const isOpen = openDates.includes(group.date);
            return (
              <AccordionItem
                key={group.date}
                bg="brand.sessionCardBg"
                borderWidth="1px"
                borderColor="brand.slateBorder"
                borderRadius="md"
                mb={0.5}
              >
                <h2>
                  <AccordionButton>
                    <VStack flex="1" align="stretch" spacing={2}>
                      {/* Date Header */}
                      <Box bg="brand.sessionHeaderBg" p={1} borderRadius="md" borderWidth="1px" borderColor="brand.bronze" boxShadow="inset 0 1px 2px rgba(0,0,0,0.1)">
                        {(() => {
                          const timingData = formatSessionTimingData(group.date, totalReal);
                          return (
                            <>
                              {/* Mobile: Two-line layout */}
                              <VStack spacing={1} display={{ base: "flex", md: "none" }} align="stretch">
                                {/* Line 1: Date and Time Range */}
                                <HStack spacing={2} justify="flex-start">
                                  <HStack spacing={1}>
                                    <CalendarIcon boxSize={3} color="brand.bronze" />
                                    <Text fontWeight="bold" color="brand.midnightBlue" fontSize="sm">{timingData.dateDisplay}</Text>
                                  </HStack>
                                  <Text color="brand.steel" fontSize="xs">|</Text>
                                  {timingData.timeRange && (
                                    <Text fontWeight="semibold" color="brand.midnightBlue" fontSize="sm">{timingData.timeRange}</Text>
                                  )}
                                </HStack>
                                
                                {/* Line 2: Session Duration and Time Played */}
                                <HStack spacing={3} justify="flex-start" fontSize="xs">
                                  <HStack spacing={1}>
                                    <TimeIcon boxSize="10px" color="brand.bronze" />
                                    <Text color="brand.steel">Session:</Text>
                                    <Text fontWeight="medium" color="brand.steel">{timingData.sessionDuration}</Text>
                                  </HStack>
                                  <HStack spacing={1}>
                                    <GiBroadsword size={10} color="currentColor" />
                                    <Text color="brand.steel">Played:</Text>
                                    <Text fontWeight="medium" color="brand.steel">{timingData.timePlayed}</Text>
                                  </HStack>
                                </HStack>
                              </VStack>

                              {/* Desktop: One line with better hierarchy */}
                              <HStack justify="space-between" align="center" display={{ base: "none", md: "flex" }}>
                                {/* Left: Date and Time Range as primary info */}
                                <HStack spacing={3}>
                                  <HStack spacing={1}>
                                    <CalendarIcon boxSize={3} color="brand.bronze" />
                                    <Text fontWeight="bold" color="brand.midnightBlue" fontSize="md">{timingData.dateDisplay}</Text>
                                  </HStack>
                                  <Text color="brand.steel" fontSize="sm">|</Text>
                                  {timingData.timeRange && (
                                    <Text fontWeight="semibold" color="brand.midnightBlue" fontSize="md">{timingData.timeRange}</Text>
                                  )}
                                </HStack>

                                {/* Right: Duration info with labels */}
                                <HStack spacing={4} fontSize="sm">
                                  <HStack spacing={1}>
                                    <TimeIcon boxSize={3} color="brand.bronze" />
                                    <Text color="brand.steel">Session:</Text>
                                    <Text fontWeight="medium" color="brand.steel">{timingData.sessionDuration}</Text>
                                  </HStack>
                                  <HStack spacing={1}>
                                    <GiBroadsword size={12} color="currentColor" />
                                    <Text color="brand.steel">Played:</Text>
                                    <Text fontWeight="medium" color="brand.steel">{timingData.timePlayed}</Text>
                                  </HStack>
                                </HStack>
                              </HStack>
                            </>
                          );
                        })()}
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
                              <Text as="span" color="brand.steel" mr={2} verticalAlign="middle">|</Text>
                              <Text as="span" color="brand.darkWin" mr={1} display="inline-block" minWidth={{ base: '22px', md: '28px' }} verticalAlign="middle" fontWeight="bold">{rec.wins}W</Text>
                              <Text as="span" color="brand.darkLoss" display="inline-block" minWidth={{ base: '22px', md: '28px' }} verticalAlign="middle" fontWeight="bold">{rec.losses}L</Text>
                              {rec.uncategorized > 0 && (
                                <Text as="span" color="brand.steel" ml={1} verticalAlign="middle">{rec.uncategorized}?</Text>
                              )}
                              {rec.eloChange !== 0 && (
                                <>
                                  <Text as="span" color="brand.steel" ml={2} mr={2} verticalAlign="middle">|</Text>
                                  <Text
                                    as="span"
                                    display="inline-block"
                                    minWidth={{ base: '30px', md: '35px' }}
                                    textAlign="right"
                                    fontFamily="mono"
                                    color={rec.eloChange > 0 ? 'brand.darkWin' : 'brand.darkLoss'}
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


                    </VStack>
                    <Box
                      w="24px"
                      h="24px"
                      bg={theme.colors.brand.stampBg}
                      borderRadius="full"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      color={theme.colors.brand.stampText}
                      fontSize="lg"
                      fontWeight="bold"
                      border="2px solid"
                      borderColor={theme.colors.brand.stampBorder}
                      boxShadow={theme.colors.brand.stampShadow}
                      transition="all 0.2s ease"
                      position="relative"
                      right="-8px"
                      _hover={{ 
                        bg: theme.colors.brand.stampBgHover,
                        color: theme.colors.brand.stampText,
                        boxShadow: theme.colors.brand.stampShadowHover
                      }}
                    >
                      <Text
                        fontSize="lg"
                        fontWeight="bold"
                        color={theme.colors.brand.stampText}
                        textShadow={theme.colors.brand.stampTextShadow}
                        lineHeight="1"
                      >
                        {isOpen ? "−" : "+"}
                      </Text>
                    </Box>
                  </AccordionButton>
                </h2>
                <AccordionPanel pb={4}>
                  {renderMatches(group.matches, isOpen)}
                </AccordionPanel>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </Box>
  );
}
