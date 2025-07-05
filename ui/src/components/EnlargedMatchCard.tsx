import { Box, VStack, HStack, Text, Link, Divider, Tooltip, Card, Avatar, Flex, Icon, useTheme, Wrap, WrapItem } from '@chakra-ui/react';
import { TimeIcon, CalendarIcon, DownloadIcon } from '@chakra-ui/icons';
import { Link as RouterLink } from 'react-router-dom';
import { formatDateTime } from '../utils/matchUtils';
import { formatDuration, parseDuration } from '../utils/timeUtils';
import { assetManager } from '../utils/assetManager';
import { PLAYER_COLORS } from './playerColors';
import { useState, useEffect } from 'react';
import { getSteamAvatar, extractSteamId } from '../services/matchService';

interface EnlargedMatchCardProps {
  match: any;
}

function PlayerAvatar({ player }: { player: any }) {
  const theme = useTheme();
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  
  useEffect(() => {
    const loadAvatar = async () => {
      try {
        const steamId = extractSteamId(player.original_name || player.name);
        console.log('Extracting Steam ID for:', player.original_name || player.name, 'Result:', steamId); // Debug log
        if (steamId) {
          const avatar = await getSteamAvatar(steamId);
          console.log('Got avatar for', steamId, ':', avatar); // Debug log
          setAvatarUrl(avatar);
        }
      } catch (error) {
        console.error('Failed to load avatar:', error);
      }
    };
    
    loadAvatar();
  }, [player.original_name, player.name]);

  const replayUrl = `https://aoe.ms/replay/?gameId=${player.match_id}&profileId=${player.user_id}`;
  const isReplayDisabled = player.replay_available === false;

  return (
    <VStack spacing={2} align="center" position="relative">
      <Box position="relative">
        <Avatar
          src={avatarUrl}
          name={player.name}
          size="lg"
          bg="brand.steel"
          color="brand.parchment"
          border="2px solid"
          borderColor={player.winner ? "brand.brightGreen" : "brand.steel"}
        />
        <Tooltip 
          label={
            isReplayDisabled
              ? 'Replay file not available'
              : `Download Replay File${player.save_game_size ? ` (${Math.round(player.save_game_size / 1024)} KB)` : ''}`
          }
          fontSize="sm"
        >
          <Box position="absolute" top="-2" right="-2">
            <Link
              href={replayUrl}
              isExternal
              w="22px"
              h="22px"
              bg={
                isReplayDisabled 
                  ? 'brand.steel'
                  : `linear-gradient(135deg, ${theme.colors.brand.bronze} 0%, ${theme.colors.brand.bronzeMedium} 30%, ${theme.colors.brand.bronzeDark} 70%, ${theme.colors.brand.bronzeDarkest} 100%)`
              }
              borderRadius="full"
              display="flex"
              alignItems="center"
              justifyContent="center"
              color={isReplayDisabled ? 'brand.stoneLight' : 'brand.brightGold'}
              fontSize="xs"
              fontWeight="bold"
              border="1px solid"
              borderColor={isReplayDisabled ? 'brand.stoneLight' : 'brand.bronze'}
              boxShadow={
                isReplayDisabled 
                  ? 'none'
                  : 'inset 0 1px 2px rgba(255,255,255,0.2), 0 1px 3px rgba(0,0,0,0.2)'
              }
              transition="all 0.2s ease"
              opacity={isReplayDisabled ? 0.5 : 1}
              cursor={isReplayDisabled ? 'not-allowed' : 'pointer'}
              pointerEvents={isReplayDisabled ? 'none' : 'auto'}
              _hover={
                isReplayDisabled 
                  ? {}
                  : { 
                      bg: `linear-gradient(135deg, ${theme.colors.brand.gold} 0%, ${theme.colors.brand.bronze} 30%, ${theme.colors.brand.bronzeMedium} 70%, ${theme.colors.brand.bronzeDark} 100%)`,
                      color: "brand.brightGold",
                      boxShadow: "inset 0 1px 2px rgba(255,255,255,0.3), 0 2px 4px rgba(0,0,0,0.25)"
                    }
              }
            >
              <Icon as={DownloadIcon} boxSize={3} />
            </Link>
          </Box>
        </Tooltip>
      </Box>
      <VStack spacing={1} align="center">
        <Link
          as={RouterLink}
          to={`/profile_id/${player.user_id}`}
          fontSize="sm"
          fontWeight="semibold"
          color="brand.gold"
          _hover={{ color: "brand.brightGold" }}
          textDecoration="none"
          textAlign="center"
          noOfLines={1}
        >
          {player.name}
        </Link>
        {/* Player Color Indicator with Index */}
        <HStack spacing={2} align="center">
          <Box
            w="32px"
            h="20px"
            bg={PLAYER_COLORS[player.color_id] || 'brand.steel'}
            borderRadius="md"
            border="2px solid"
            borderColor="brand.steel"
            display="flex"
            alignItems="center"
            justifyContent="center"
            boxShadow="md"
          >
            <Text
              fontSize="xs"
              fontWeight="bold"
              color="brand.parchment"
              textShadow="1px 1px 2px rgba(0,0,0,0.8)"
            >
              {player.color_id || '?'}
            </Text>
          </Box>
          <Text fontSize="xs" color="brand.steel" fontWeight="medium">
            Player {player.color_id || '?'}
          </Text>
        </HStack>
        {/* Civ Icon and Name */}
        <HStack spacing={2} align="center">
          <Box
            w="28px"
            h="28px"
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
              fontSize="8px"
              fontWeight="bold"
              color="brand.bronze"
              bg="brand.stoneLight"
            >
              {(typeof player.civ === 'string' ? player.civ : '???').slice(0, 3).toUpperCase()}
            </Box>
          </Box>
          <Text fontSize="xs" color="brand.steel" textAlign="center">
            {player.civ}
          </Text>
        </HStack>
        {player.rating && (
          <Text fontSize="xs" color="brand.steel" fontFamily="mono">
            {player.rating}
            {player.rating_change && (
              <Text as="span" color={player.rating_change > 0 ? 'brand.brightGreen' : 'brand.brightRed'} ml={1}>
                ({player.rating_change > 0 ? '+' : ''}{player.rating_change})
              </Text>
            )}
          </Text>
        )}
      </VStack>
    </VStack>
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
        <HStack justify="space-between" spacing={6} wrap="wrap">
          {/* Date & Time */}
          <VStack align="start" spacing={1}>
            <HStack spacing={2}>
              <CalendarIcon boxSize={4} color="brand.bronze" />
              <Text fontSize="sm" color="brand.steel" fontWeight="semibold">
                Date & Time
              </Text>
            </HStack>
            <Text color="brand.midnightBlue" fontSize="md" fontWeight="medium">
              {formatDateTime(match.start_time)}
            </Text>
          </VStack>
          
          {/* Game Duration */}
          <VStack align="start" spacing={1}>
            <HStack spacing={2}>
              <TimeIcon boxSize={4} color="brand.zoolanderBlue" />
              <Text fontSize="sm" color="brand.steel" fontWeight="semibold">
                Game Duration
              </Text>
            </HStack>
            <Text color="brand.midnightBlue" fontSize="md" fontWeight="medium">
              {formatDuration(durationSec)}
            </Text>
          </VStack>
          
          {/* Real Time */}
          <VStack align="start" spacing={1}>
            <HStack spacing={2}>
              <TimeIcon boxSize={4} color="brand.bronze" />
              <Text fontSize="sm" color="brand.steel" fontWeight="semibold">
                Real Time
              </Text>
            </HStack>
            <Text color="brand.midnightBlue" fontSize="md" fontWeight="medium">
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
          <VStack flex="1" spacing={6} align="stretch">
            {match.teams && match.teams.length > 0 && (
              <VStack spacing={4} align="stretch">
                <Text fontSize="lg" fontWeight="semibold" color="brand.midnightBlue" textAlign="center">
                  Teams & Players
                </Text>
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
                              <PlayerAvatar player={player} />
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