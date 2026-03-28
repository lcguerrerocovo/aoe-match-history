import React, { useState, useEffect } from 'react';
import { Box, VStack, HStack, Text, Link, Avatar, Icon } from '@chakra-ui/react';
import { Tooltip } from '../ui/tooltip';
import { FiDownload } from 'react-icons/fi';
import { Link as RouterLink } from 'react-router-dom';
import { useThemeMode } from '../../theme/ThemeProvider';
import type { Player } from '../../types/match';
import { assetManager } from '../../utils/assetManager';
import { PLAYER_COLORS } from '../../utils/playerColors';
import { getSteamAvatar, extractSteamId, checkReplayAvailability } from '../../services/matchService';

interface PlayerAvatarProps {
  player: Player;
  matchId: string;
  teamSize?: number;
}

export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({ player, matchId, teamSize = 4 }) => {
  const { isDark } = useThemeMode();
  const isExpansive = teamSize <= 2;
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

  // Determine player color for the vertical stripe
  const steelHex = isDark ? '#CBD5E0' : '#5A6478';
  const bgColor = PLAYER_COLORS[player.color_id] || steelHex;

  return (
    <Box w="full">
      <HStack
        gap={{ base: 2, md: 2, xl: 3 }}
        align="stretch"
        w="full"
        minH={{ base: '60px', md: '56px', xl: '68px' }}
      >
        {/* Vertical color stripe */}
        <Box
          w={{ base: "4px", md: "5px" }}
          borderRadius="sm"
          bg={bgColor}
          opacity={0.5}
          flexShrink={0}
          alignSelf="stretch"
          data-testid="color-indicator"
        />

        {/* Avatar */}
        <Avatar.Root
          size={isExpansive ? { base: "md", md: "md", xl: "lg" } : { base: "sm", md: "sm", xl: "md" }}
          bg="brand.inkMuted"
          color="brand.parchment"
          border="1px solid"
          borderColor={player.winner ? "brand.redChalk" : "brand.inkMuted"}
          alignSelf="center"
          data-testid="player-avatar"
        >
          <Avatar.Fallback name={player.name} />
          <Avatar.Image src={avatarUrl} />
        </Avatar.Root>

        {/* Details column: name, civ, rating */}
        <VStack gap={1} align="start" flex="1" minW={0} justifyContent="center">
          {/* Player name link */}
          <Tooltip content={player.name}>
            <Link
              fontSize={isExpansive ? { base: "sm", md: "sm", xl: "md" } : { base: "xs", md: "xs", xl: "sm" }}
              fontWeight="semibold"
              color="brand.inkDark"
              _hover={{ color: "brand.inkAccent", textDecoration: "underline" }}
              textDecoration="none"
              lineClamp={1}
              lineHeight="tight"
              data-testid="player-name"
              asChild
            >
              <RouterLink to={`/profile_id/${player.user_id}`}>
                {player.name}
              </RouterLink>
            </Link>
          </Tooltip>

          {/* Civ Icon and Name */}
          <HStack gap={1} align="center">
            <Box
              w={{ base: "18px", md: "20px" }}
              h={{ base: "18px", md: "20px" }}
              borderRadius="sm"
              overflow="hidden"
              bg="brand.stoneLight"
              borderWidth={0}
            >
              <img
                src={assetManager.getCivEmblem(String(player.civ || 'unknown'))}
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
                color="brand.inkMuted"
                bg="brand.stoneLight"
              >
                {(typeof player.civ === 'string' ? player.civ : '???').slice(0, 3).toUpperCase()}
              </Box>
            </Box>
            <Text fontSize={{ base: "2xs", md: "xs" }} color="brand.inkDark" lineClamp={1}>
              {player.civ}
            </Text>
          </HStack>

          {/* Rating and change */}
          {player.rating && (
            <Text fontSize={isExpansive ? { base: "xs", md: "xs", xl: "sm" } : { base: "2xs", md: "2xs", xl: "xs" }} color="brand.inkDark" fontFamily="mono" fontWeight="bold" data-testid="player-rating">
              {player.rating}
              {player.rating_change && (
                <Text as="span" fontSize={{ base: '2xs', md: '2xs', lg: 'xs' }} color={player.rating_change > 0 ? 'brand.darkWin' : 'brand.darkLoss'} ml={1} fontWeight="semibold">
                  ({player.rating_change > 0 ? '+' : ''}{player.rating_change})
                </Text>
              )}
            </Text>
          )}
        </VStack>

        {/* Right margin: player number + replay annotation */}
        <VStack
          gap={1}
          align="flex-end"
          justifyContent="space-between"
          py={1}
          flexShrink={0}
        >
          {/* Player number */}
          <Text
            fontSize="xs"
            fontWeight="bold"
            fontFamily="mono"
            color="brand.inkMuted"
          >
            #{player.color_id ?? '?'}
          </Text>

          {/* Replay annotation */}
          <Tooltip
            content={
              isReplayLoading
                ? 'Checking replay availability...'
                : isReplayDisabled
                  ? 'Replay file not available'
                  : `Download Replay File${player.save_game_size ? ` (${Math.round(player.save_game_size / 1024)} KB)` : ''}`
            }
          >
            <Link
              href={replayUrl}
              fontSize={{ base: "2xs", md: "xs" }}
              fontStyle="italic"
              fontFamily="body"
              color={isReplayLoading || isReplayDisabled ? 'brand.inkMuted' : 'brand.redChalk'}
              opacity={isReplayLoading || isReplayDisabled ? 0.35 : 0.8}
              cursor={isReplayLoading || isReplayDisabled ? 'not-allowed' : 'pointer'}
              pointerEvents={isReplayLoading || isReplayDisabled ? 'none' : 'auto'}
              textDecoration="none"
              transition="all 0.2s ease-in-out"
              _hover={
                isReplayLoading || isReplayDisabled
                  ? {}
                  : {
                      opacity: 1,
                      textDecoration: 'underline',
                      textUnderlineOffset: '2px',
                    }
              }
              display="flex"
              alignItems="center"
              gap={1}
              target='_blank'
              rel='noopener noreferrer'
              data-testid="download-button"
            >
              <Icon boxSize={3}><FiDownload /></Icon>
              <Text as="span" fontSize="inherit" fontStyle="inherit">replay</Text>
            </Link>
          </Tooltip>
        </VStack>
      </HStack>
    </Box>
  );
};
