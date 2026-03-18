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
import { getTextColorForBackground, getTextShadowForBackground } from '../../utils/colorUtils';

interface PlayerAvatarProps {
  player: Player;
  matchId: string;
}

// Hardcoded gradient hex values (non-semantic, same in light/dark)
const BRONZE_LIGHT = '#C8A26B';
const BRONZE = '#B37A3E';
const BRONZE_MEDIUM = '#8B5A2B';
const BRONZE_DARK = '#6B4423';
const GOLD_LIGHT = '#D4AF37';
const GOLD_DARK = '#FFD700';

export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({ player, matchId }) => {
  const { isDark } = useThemeMode();
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
  const steelHex = isDark ? '#CBD5E0' : '#5A6478';
  const bgColor = PLAYER_COLORS[player.color_id] || steelHex;

  const numberTextColor = getTextColorForBackground(bgColor, isDark, '#fff', '#111');
  const textShadow = getTextShadowForBackground(bgColor, isDark);

  const bronzeLightResolved = isDark ? '#CFA46B' : BRONZE_LIGHT;
  const bronzeResolved = isDark ? '#CD7F32' : BRONZE;
  const goldResolved = isDark ? GOLD_DARK : GOLD_LIGHT;

  return (
    <Box position="relative" w="full">
      {/* Top row: avatar and details */}
      <HStack
        gap={{ base: 1, md: 2 }}
        align="flex-start"
        w="full"
      >
        {/* Avatar */}
        <Avatar.Root
          size={{ base: "sm", md: "md", lg: "md" }}
          bg="brand.steel"
          color="brand.parchment"
          border="1px solid"
          borderColor={player.winner ? "brand.brightGreen" : "brand.steel"}
          data-testid="player-avatar"><Avatar.Fallback name={player.name} /><Avatar.Image src={avatarUrl} /></Avatar.Root>

        {/* Details column */}
        <VStack gap={1} align="start" flex="1" minW={0}>
          {/* Player Color Indicator with Index */}
          <HStack gap={0} align="center" w="full">
            <Box
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
            <Text fontSize={{ base: "2xs", md: "xs" }} color="brand.midnightBlue" lineClamp={1}>
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
        fontSize={{ base: "xs", md: "sm" }}
        fontWeight="semibold"
        color="brand.midnightBlue"
        _hover={{ color: "brand.zoolanderBlue", textDecoration: "underline" }}
        textDecoration="none"
        lineClamp={1}
        maxW={{ base: "calc(100% - 16px)", md: "calc(100% - 20px)" }}
        pr={{ base: 4, md: 5 }}
        overflow="hidden"
        textOverflow="ellipsis"
        whiteSpace="nowrap"
        title={player.name}
        mt={1}
        data-testid="player-name"
        asChild><RouterLink to={`/profile_id/${player.user_id}`}>
          {player.name}
        </RouterLink></Link>
      {/* Download button bottom-right */}
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
          w={{ base: "18px", md: "22px" }}
          h={{ base: "18px", md: "22px" }}
          bg={
            isReplayLoading
              ? 'brand.steel'
              : isReplayDisabled
                ? 'brand.steel'
                : `linear-gradient(135deg, ${bronzeLightResolved} 0%, ${bronzeResolved} 40%, ${BRONZE_MEDIUM} 80%, ${BRONZE_DARK} 100%)`
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
                  bg: `linear-gradient(135deg, ${goldResolved} 0%, ${bronzeResolved} 30%, ${BRONZE_MEDIUM} 70%, ${BRONZE_DARK} 100%)`,
                  color: "brand.brightGold",
                  boxShadow: "inset 0 1px 2px rgba(255,255,255,0.3), 0 2px 4px rgba(0,0,0,0.25)"
                }
          }
          target='_blank'
          rel='noopener noreferrer'>
          <Icon boxSize={{ base: 3, md: 4 }} asChild><FiDownload /></Icon>
        </Link>
      </Tooltip>
    </Box>
  );
};
