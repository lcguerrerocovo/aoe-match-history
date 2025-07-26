import React, { useState, useEffect } from 'react';
import { Box, VStack, HStack, Text, Link, Divider, Tooltip, Card, Avatar, Flex, Icon, useTheme, SimpleGrid, useBreakpointValue, useColorMode } from '@chakra-ui/react';
import { TimeIcon, CalendarIcon, DownloadIcon } from '@chakra-ui/icons';
import { Link as RouterLink } from 'react-router-dom';
import { formatDateTime } from '../utils/matchUtils';
import { formatDuration, parseDuration } from '../utils/timeUtils';
import { assetManager } from '../utils/assetManager';
import { PLAYER_COLORS } from './playerColors';
import { getSteamAvatar, extractSteamId, checkReplayAvailability } from '../services/matchService';

interface FullMatchSummaryCardProps {
  match: any;
  activePids?: string[];
  onToggle?: (pid: string) => void;
}

interface PlayerAvatarProps {
  player: any;
  matchId: string;
  active: boolean;
  onToggle: (pid: string) => void;
}

const PlayerAvatar: React.FC<PlayerAvatarProps> = ({ player, matchId, active, onToggle }) => {
  const theme = useTheme();
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [replayAvailable, setReplayAvailable] = useState<boolean | null>(null); // null = loading, true/false = result

  useEffect(() => {
    const loadAvatar = async () => {
      try {
        const steamId = extractSteamId(player.original_name || player.name);
        if (steamId) {
          const avatar = await getSteamAvatar(steamId);
          setAvatarUrl(avatar);
        }
      } catch (error) {
        console.error('Failed to load avatar:', error);
      }
    };
    
    loadAvatar();
  }, [player.original_name, player.name]);

  useEffect(() => {
    const checkReplay = async () => {
      try {
        // Add a small stagger delay based on player index to avoid rate limiting
        // This spreads out the requests over time instead of all at once
        const delay = (player.color_id || 0) * 200; // 200ms between each request
        await new Promise(resolve => setTimeout(resolve, delay));
        
        const available = await checkReplayAvailability(matchId, player.user_id.toString());
        setReplayAvailable(available);
      } catch (error) {
        console.error('Failed to check replay availability:', error);
        setReplayAvailable(true); // Default to available on error
      }
    };
    
    checkReplay();
  }, [matchId, player.user_id, player.color_id]);

  const replayUrl = `https://aoe.ms/replay/?gameId=${matchId}&profileId=${player.user_id}`;
  const isReplayDisabled = replayAvailable === false;
  const isReplayLoading = replayAvailable === null;

  // Determine background and foreground colors for the player number rectangle
  const bgColor = PLAYER_COLORS[player.color_id] || theme.colors.brand.steel;

  const computeIsLight = (hex: string) => {
    const cleaned = hex.replace('#', '');
    if (cleaned.length !== 6) return false;
    const r = parseInt(cleaned.substr(0, 2), 16);
    const g = parseInt(cleaned.substr(2, 2), 16);
    const b = parseInt(cleaned.substr(4, 2), 16);
    // Perceptive luminance formula (lower threshold to match APM pill logic)
    return (0.299 * r + 0.587 * g + 0.114 * b) > 130;
  };

  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';
  const isLightBg = computeIsLight(bgColor);
  // In dark mode, always use white for the number text
  // In light mode, use dark text for light backgrounds, white for dark backgrounds
  const numberTextColor = isDark ? theme.colors.brand.white : (isLightBg ? theme.colors.brand.pureBlack : theme.colors.brand.white);
  // Only add text shadow for yellow/cyan in light mode
  const needsShadow = !isDark && (player.color_id === 4 || player.color_id === 5 || isLightBg);
  const textShadow = needsShadow ? '0 1px 1.5px rgba(0,0,0,0.18)' : 'none';

  return (
    <Box position="relative" w="full">
      {/* Top row: avatar and details */}
      <HStack
        spacing={{ base: 1, md: 2 }}
        align="flex-start"
        w="full"
      >
        {/* Avatar */}
        <Avatar
          src={avatarUrl}
          name={player.name}
          size={{ base: "sm", md: "md", lg: "md" }}
          bg="brand.steel"
          color="brand.parchment"
          border="1px solid"
          borderColor={player.winner ? "brand.brightGreen" : "brand.steel"}
          data-testid="player-avatar"
        />

        {/* Details column */}
        <VStack spacing={1} align="start" flex="1" minW={0}>
          {/* Player Color Indicator with Index */}
          <HStack spacing={0} align="center" w="full">
            <Box
              onClick={() => onToggle(String(player.user_id))}
              cursor="pointer"
              opacity={active ? 1 : 0.4}
              w={{ base: '75px', md: '75px' }}
              h={{ base: "16px", md: "18px" }}
              bg={bgColor}
              borderRadius="sm"
              border="1px solid"
              borderColor="brand.steel"
              display="flex"
              alignItems="center"
              justifyContent="center"
              boxShadow="sm"
              data-testid="color-indicator"
            >
              <Text
                fontSize={{ base: "2xs", md: "xs" }}
                fontWeight="bold"
                color={numberTextColor}
                style={{ textShadow }}
              >
                {player.color_id || '?'}
              </Text>
            </Box>
          </HStack>

          {/* Civ Icon and Name */}
          <HStack spacing={1} align="center">
            <Box
              w={{ base: "18px", md: "20px" }}
              h={{ base: "18px", md: "20px" }}
              borderRadius="sm"
              overflow="hidden"
              bg="brand.stoneLight"
              borderWidth={0}
            >
              <img
                src={assetManager.getCivIcon(String(player.civ || 'unknown'))}
                alt={String(player.civ || 'Unknown')}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const textElement = target.parentElement?.querySelector('.civ-fallback') as HTMLElement;
                  if (textElement) {
                    textElement.style.display = 'flex';
                  }
                }}
              />
              <Box
                className="civ-fallback"
                display="none"
                alignItems="center"
                justifyContent="center"
                w="100%"
                h="100%"
                fontSize={{ base: "6px", md: "8px" }}
                fontWeight="bold"
                color="brand.bronze"
                bg="brand.stoneLight"
              >
                {(typeof player.civ === 'string' ? player.civ : '???').slice(0, 3).toUpperCase()}
              </Box>
            </Box>
            <Text fontSize={{ base: "2xs", md: "xs" }} color="brand.midnightBlue" noOfLines={1}>
              {player.civ}
            </Text>
          </HStack>

          {/* Rating and change */}
          {player.rating && (
            <Text fontSize={{ base: "2xs", md: "xs", lg: "sm" }} color="brand.midnightBlue" fontFamily="mono" fontWeight="bold" data-testid="player-rating">
              {player.rating}
              {player.rating_change && (
                <Text as="span" fontSize={{ base: '2xs', md: '2xs', lg: 'xs' }} color={player.rating_change > 0 ? 'brand.darkWin' : 'brand.darkLoss'} ml={1} fontWeight="semibold">
                  ({player.rating_change > 0 ? '+' : ''}{player.rating_change})
                </Text>
              )}
            </Text>
          )}
        </VStack>
      </HStack>

      {/* Alias row */}
      <Link
        as={RouterLink}
        to={`/profile_id/${player.user_id}`}
        fontSize={{ base: "xs", md: "sm" }}
        fontWeight="semibold"
        color="brand.midnightBlue"
        _hover={{ color: "brand.zoolanderBlue", textDecoration: "underline" }}
        textDecoration="none"
        noOfLines={1}
        maxW={{ base: "calc(100% - 16px)", md: "calc(100% - 20px)" }}
        pr={{ base: 4, md: 5 }}
        overflow="hidden"
        textOverflow="ellipsis"
        whiteSpace="nowrap"
        title={player.name}
        mt={1}
        data-testid="player-name"
      >
        {player.name}
      </Link>

      {/* Download button bottom-right */}
      <Tooltip 
        label={
          isReplayLoading
            ? 'Checking replay availability...'
            : isReplayDisabled
              ? 'Replay file not available'
              : `Download Replay File${player.save_game_size ? ` (${Math.round(player.save_game_size / 1024)} KB)` : ''}`
        }
        fontSize="sm"
      >
        <Link
          href={replayUrl}
          isExternal
          w={{ base: "18px", md: "22px" }}
          h={{ base: "18px", md: "22px" }}
          bg={
            isReplayLoading
              ? 'brand.steel'
              : isReplayDisabled 
                ? 'brand.steel'
                : `linear-gradient(135deg, ${theme.colors.brand.bronzeLight} 0%, ${theme.colors.brand.bronze} 40%, ${theme.colors.brand.bronzeMedium} 80%, ${theme.colors.brand.bronzeDark} 100%)`
          }
          borderRadius="full"
          display="flex"
          boxSizing="border-box"
          alignItems="center"
          justifyContent="center"
          color={isReplayLoading || isReplayDisabled ? 'brand.stoneLight' : 'brand.brightGold'}
          fontSize={{ base: "2xs", md: "xs" }}
          fontWeight="bold"
          borderWidth={{ base: 0, md: '1px' }}
          borderColor={isReplayLoading || isReplayDisabled ? 'brand.stoneLight' : 'brand.bronze'}
          boxShadow={
            isReplayLoading || isReplayDisabled 
              ? 'none'
              : 'inset 0 1px 2px rgba(255,255,255,0.2), 0 1px 3px rgba(0,0,0,0.2)'
          }
          transition="all 0.2s ease"
          opacity={isReplayLoading || isReplayDisabled ? 0.5 : 1}
          cursor={isReplayLoading || isReplayDisabled ? 'not-allowed' : 'pointer'}
          pointerEvents={isReplayLoading || isReplayDisabled ? 'none' : 'auto'}
          data-testid="download-button"
          position="absolute"
          bottom={-1}
          right={{ base: -3, lg: -5 }}
          _hover={
            isReplayLoading || isReplayDisabled 
              ? {}
              : { 
                  bg: `linear-gradient(135deg, ${theme.colors.brand.gold} 0%, ${theme.colors.brand.bronze} 30%, ${theme.colors.brand.bronzeMedium} 70%, ${theme.colors.brand.bronzeDark} 100%)`,
                  color: "brand.brightGold",
                  boxShadow: "inset 0 1px 2px rgba(255,255,255,0.3), 0 2px 4px rgba(0,0,0,0.25)"
                }
          }
        >
          <Icon as={DownloadIcon} boxSize={{ base: 3, md: 4 }} />
        </Link>
      </Tooltip>
    </Box>
  );
}

function MapCard({ match }: { match: any }) {
  const mapName = match.map || '';
  const [imageError, setImageError] = useState(false);
  
  const imageUrl = imageError 
    ? assetManager.getGenericMapImage() 
    : assetManager.getMapImage(mapName);

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <VStack spacing={4} align="center">
      <Box
        w={{ base: '160px', md: '180px', lg: '200px' }}
        h={{ base: '160px', md: '180px', lg: '200px' }}
        bg="transparent"
        borderRadius="md"
        overflow="hidden"
      >
        <img
          src={imageUrl}
          alt={mapName}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={handleImageError}
        />
      </Box>
      <Text fontSize="xl" fontWeight="semibold" color="brand.midnightBlue" textAlign="center">
        {mapName}
      </Text>
    </VStack>
  );
}

function MatchDetails({ match }: { match: any }) {
  const durationSec = parseDuration(match.duration);
  const gameTimeSec = Math.round(durationSec * 1.7);

  return (
    <Box
      w="100%"
      p={4}
      bg="brand.sessionHeaderBg"
      borderRadius="md"
      border="1px solid"
      borderColor="brand.bronze"
      boxShadow="inset 0 1px 2px rgba(0,0,0,0.1)"
      data-testid="match-details"
    >
      <VStack spacing={3} align="stretch">
        {/* Title Row */}
        <HStack justify="space-between" align="center" wrap="wrap">
          <Text fontWeight="bold" color="brand.midnightBlue" fontSize="2xl">
            Match #{match.match_id}
          </Text>
          <Text color="brand.steel" fontSize="xl" fontWeight="semibold">
            {match.description}
          </Text>
        </HStack>
        
        <Divider borderColor="brand.steel" />
        
        {/* Details Grid */}
        <HStack 
          justify="space-between" 
          spacing={{ base: 2, md: 6 }} 
          wrap={{ base: "wrap", md: "nowrap" }}
          data-testid="details-row"
        >
          {/* Date & Time */}
          <VStack align="start" spacing={1} flex={{ base: "1", md: "auto" }} minW={{ base: "100px", md: "auto" }}>
            <HStack spacing={2}>
              <CalendarIcon boxSize={4} color="brand.bronze" />
              <Text fontSize="sm" color="brand.steel" fontWeight="semibold">
                <Box as="span" display={{ base: "inline", md: "none" }}>Date</Box>
                <Box as="span" display={{ base: "none", md: "inline" }}>Date & Time</Box>
              </Text>
            </HStack>
            <Text color="brand.midnightBlue" fontSize={{ base: "xs", md: "md" }} fontWeight="medium" data-testid="match-detail-value">
              {formatDateTime(match.start_time)}
            </Text>
          </VStack>
          
          {/* Game Duration */}
          <VStack align="start" spacing={1} flex={{ base: "1", md: "auto" }} minW={{ base: "80px", md: "auto" }}>
            <HStack spacing={2}>
              <TimeIcon boxSize={4} color="brand.zoolanderBlue" />
              <Text fontSize="sm" color="brand.steel" fontWeight="semibold">
                <Box as="span" display={{ base: "inline", md: "none" }}>Game</Box>
                <Box as="span" display={{ base: "none", md: "inline" }}>Game Duration</Box>
              </Text>
            </HStack>
            <Text color="brand.midnightBlue" fontSize={{ base: "xs", md: "md" }} fontWeight="medium" data-testid="match-detail-value">
              {formatDuration(gameTimeSec)}
            </Text>
          </VStack>
          
          {/* Real Time */}
          <VStack align="start" spacing={1} flex={{ base: "1", md: "auto" }} minW={{ base: "80px", md: "auto" }}>
            <HStack spacing={2}>
              <TimeIcon boxSize={4} color="brand.bronze" />
              <Text fontSize="sm" color="brand.steel" fontWeight="semibold">
                <Box as="span" display={{ base: "inline", md: "none" }}>Real</Box>
                <Box as="span" display={{ base: "none", md: "inline" }}>Real Time</Box>
              </Text>
            </HStack>
            <Text color="brand.midnightBlue" fontSize={{ base: "xs", md: "md" }} fontWeight="medium" data-testid="match-detail-value">
              {formatDuration(durationSec)}
            </Text>
          </VStack>
        </HStack>
      </VStack>
    </Box>
  );
}

export function FullMatchSummaryCard({ match, activePids, onToggle }: FullMatchSummaryCardProps) {
  const isMobile = useBreakpointValue({ base: true, md: false });

  return (
    <Card variant="match" w="100%" p={6} bg="brand.sessionCardBg" borderColor="brand.slateBorder" borderWidth="1px" data-testid="enlarged-match-card">
      <VStack spacing={6} align="stretch">
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
          <VStack flex="1" align="stretch" spacing={4}>
            {match.teams && match.teams.length > 0 && (
              <VStack spacing={4} align="stretch">
                {match.teams.map((team: any[], teamIndex: number) => {
                  const isWinner = match.winning_teams?.includes(teamIndex + 1) || match.winning_team === teamIndex + 1;
                  
                  return (
                    <Card 
                      key={teamIndex} 
                      variant={isWinner ? 'winner' : 'loser'}
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
                        spacing={{ base: 1, md: team.length >= 4 ? 1 : 2, lg: team.length >= 4 ? 1 : 2 }}
                        templateColumns={{
                          base: `repeat(${Math.min(team.length, 2)}, minmax(0, 1fr))`,
                          md: `repeat(${Math.min(team.length, 4)}, minmax(0, 1fr))`,
                          lg: `repeat(${Math.min(team.length, 4)}, minmax(0, 1fr))`,
                        }}
                        justifyItems={team.length <= 2 ? 'center' : 'stretch'}
                      >
                        {team.map((player: any, playerIndex: number) => {
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
                                <PlayerAvatar player={player} matchId={match.match_id} active={activePids ? activePids.includes(String(player.user_id)) : true} onToggle={onToggle ?? (()=>{})} />
                              </Box>
                            </Box>
                          );
                        })}
                      </SimpleGrid>
                    </Card>
                  );
                })}
              </VStack>
            )}
          </VStack>
        </Flex>
      </VStack>
    </Card>
  );
} 