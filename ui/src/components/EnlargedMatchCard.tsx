import React, { useState, useEffect } from 'react';
import { Box, VStack, HStack, Text, Link, Divider, Tooltip, Card, Avatar, Flex, Icon, useTheme, Wrap, WrapItem } from '@chakra-ui/react';
import { TimeIcon, CalendarIcon, DownloadIcon } from '@chakra-ui/icons';
import { Link as RouterLink } from 'react-router-dom';
import { formatDateTime } from '../utils/matchUtils';
import { formatDuration, parseDuration } from '../utils/timeUtils';
import { assetManager } from '../utils/assetManager';
import { PLAYER_COLORS } from './playerColors';
import { getSteamAvatar, extractSteamId, checkReplayAvailability } from '../services/matchService';

interface EnlargedMatchCardProps {
  match: any;
}

interface PlayerAvatarProps {
  player: any;
  matchId: string;
}

const PlayerAvatar: React.FC<PlayerAvatarProps> = ({ player, matchId }) => {
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

  return (
    <HStack spacing={{ base: 2, md: 3 }} align="start" position="relative" w="full">
      {/* Avatar with name below */}
      <VStack spacing={1} align="center" minW="60px">
        <Box position="relative">
          <Avatar
            src={avatarUrl}
            name={player.name}
            size={{ base: "md", md: "lg" }}
            bg="brand.steel"
            color="brand.parchment"
            border="2px solid"
            borderColor={player.winner ? "brand.brightGreen" : "brand.steel"}
          />
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
            <Box position="absolute" top="-2" right="-2">
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
                      : `linear-gradient(135deg, ${theme.colors.brand.bronze} 0%, ${theme.colors.brand.bronzeMedium} 30%, ${theme.colors.brand.bronzeDark} 70%, ${theme.colors.brand.bronzeDarkest} 100%)`
                }
                borderRadius="full"
                display="flex"
                alignItems="center"
                justifyContent="center"
                color={isReplayLoading || isReplayDisabled ? 'brand.stoneLight' : 'brand.brightGold'}
                fontSize={{ base: "2xs", md: "xs" }}
                fontWeight="bold"
                border="1px solid"
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
                <Icon as={DownloadIcon} boxSize={{ base: 2.5, md: 3 }} />
              </Link>
            </Box>
          </Tooltip>
        </Box>
        
        {/* Player name below avatar */}
        <Link
          as={RouterLink}
          to={`/profile_id/${player.user_id}`}
          fontSize={{ base: "xs", md: "sm" }}
          fontWeight="semibold"
          color="brand.midnightBlue"
          _hover={{ color: "brand.zoolanderBlue", textDecoration: "underline" }}
          textDecoration="none"
          textAlign="center"
          noOfLines={1}
          maxW={{ base: "70px", md: "90px" }}
          overflow="hidden"
          textOverflow="ellipsis"
          whiteSpace="nowrap"
          title={player.name}
        >
          {player.name}
        </Link>
      </VStack>

      {/* Player details to the right */}
      <VStack spacing={1} align="start" flex="1" minW={0}>
        {/* Player Color Indicator with Index */}
        <HStack spacing={1} align="center">
          <Box
            w={{ base: "20px", md: "24px" }}
            h={{ base: "14px", md: "16px" }}
            bg={PLAYER_COLORS[player.color_id] || 'brand.steel'}
            borderRadius="sm"
            border="1px solid"
            borderColor="brand.steel"
            display="flex"
            alignItems="center"
            justifyContent="center"
            boxShadow="sm"
          >
            <Text
              fontSize={{ base: "3xs", md: "2xs" }}
              fontWeight="bold"
              color="brand.parchment"
              textShadow="1px 1px 2px rgba(0,0,0,0.8)"
            >
              {player.color_id || '?'}
            </Text>
          </Box>
          <Text fontSize={{ base: "2xs", md: "xs" }} color="brand.steel" fontWeight="medium">
            Player {player.color_id || '?'}
          </Text>
        </HStack>
        
        {/* Civ Icon and Name */}
        <HStack spacing={1} align="center">
          <Box
            w={{ base: "20px", md: "24px" }}
            h={{ base: "20px", md: "24px" }}
            borderRadius="sm"
            overflow="hidden"
            bg="brand.stoneLight"
            border="1px solid"
            borderColor="brand.steel"
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
          <Text fontSize={{ base: "2xs", md: "xs" }} color="brand.steel" noOfLines={1}>
            {player.civ}
          </Text>
        </HStack>
        
        {/* Rating and change */}
        {player.rating && (
          <Text fontSize={{ base: "xs", md: "sm" }} color="brand.midnightBlue" fontFamily="mono" fontWeight="bold">
            {player.rating}
            {player.rating_change && (
              <Text as="span" color={player.rating_change > 0 ? 'brand.darkWin' : 'brand.darkLoss'} ml={1} fontWeight="semibold">
                ({player.rating_change > 0 ? '+' : ''}{player.rating_change})
              </Text>
            )}
          </Text>
        )}
      </VStack>
    </HStack>
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
        w="200px"
        h="200px"
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
  const realTimeSec = Math.round(durationSec / 1.7);

  return (
    <Box
      w="100%"
      p={4}
      bg="brand.topbarBg"
      borderRadius="md"
      border="1px solid"
      borderColor="brand.steel"
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
            <Text color="brand.midnightBlue" fontSize={{ base: "xs", md: "md" }} fontWeight="medium">
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
            <Text color="brand.midnightBlue" fontSize={{ base: "xs", md: "md" }} fontWeight="medium">
              {formatDuration(durationSec)}
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
            <Text color="brand.midnightBlue" fontSize={{ base: "xs", md: "md" }} fontWeight="medium">
              {formatDuration(realTimeSec)}
            </Text>
          </VStack>
        </HStack>
      </VStack>
    </Box>
  );
}

export function EnlargedMatchCard({ match }: EnlargedMatchCardProps) {

  return (
    <Card variant="match" w="100%" p={6}>
      <VStack spacing={6} align="stretch">
        {/* Match Details */}
        <MatchDetails match={match} />
        
        {/* Main Content */}
        <Flex
          direction={{ base: 'column', lg: 'row' }}
          gap={8}
          align="stretch"
          justify="space-between"
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
                      p={4}
                      position="relative"
                    >
                      {isWinner && (
                        <Box position="absolute" top="-16px" right="-12px" zIndex={1} fontSize="3xl">
                          🏆
                        </Box>
                      )}
                      <VStack spacing={3} align="stretch">
                        <HStack justify="space-between" align="center">
                          <Text fontWeight="bold" color="brand.midnightBlue" fontSize="lg">
                            Team {teamIndex + 1}
                          </Text>
                        </HStack>
                        <Wrap spacing={4} justify="center">
                          {team.map((player: any, playerIndex: number) => (
                            <WrapItem key={playerIndex}>
                              <PlayerAvatar player={player} matchId={match.match_id} />
                            </WrapItem>
                          ))}
                        </Wrap>
                      </VStack>
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