import { Box, VStack, Text, Flex, Link, Icon } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { useEffect, useState, useRef, memo } from 'react';
import { keyframes } from '@emotion/react';
import { FiEye } from 'react-icons/fi';
import type { LiveMatch, LiveMatchPlayer } from '../types/liveMatch';
import { assetManager } from '../utils/assetManager';

const livePulse = keyframes`
  0%, 100% { opacity: 0.85; box-shadow: 0 0 3px var(--chakra-colors-brand-red-chalk); }
  50% { opacity: 1; box-shadow: 0 0 8px 1px var(--chakra-colors-brand-red-chalk); }
`;

const dotPulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
`;

const skeletonPulse = keyframes`
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
`;

export function PulsingDot({ size = '8px' }: { size?: string }) {
  return (
    <Box
      w={size}
      h={size}
      borderRadius="full"
      bg="brand.redChalk"
      flexShrink={0}
      css={{ animation: `${dotPulse} 2s ease-in-out infinite` }}
    />
  );
}

// AoE2 ranked games run at 1.7x real-time speed
const GAME_SPEED = 1.7;

function formatElapsed(startTime: number): string {
  const realSeconds = Math.floor(Date.now() / 1000) - startTime;
  if (realSeconds < 0) return '0:00';
  const gameSeconds = Math.floor(realSeconds * GAME_SPEED);
  const hours = Math.floor(gameSeconds / 3600);
  const minutes = Math.floor((gameSeconds % 3600) / 60);
  const secs = gameSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(secs)}`;
  return `${minutes}:${pad(secs)}`;
}

export const PlayerRow = memo(function PlayerRow({ player, isHighlighted, rowIndex = 0 }: { player: LiveMatchPlayer; isHighlighted?: boolean; rowIndex?: number }) {
  const hasCiv = typeof player.civ === 'string' && player.civ !== '0';

  return (
    <Flex
      align="center"
      w="100%"
      borderBottomWidth="1px"
      borderColor="brand.stone"
      p={{ base: 1, md: 1.5 }}
      bg={rowIndex % 2 === 0 ? 'brand.cardBg' : 'brand.stoneLight'}
      _last={{ borderBottomWidth: 0 }}
    >
      {/* Civ icon */}
      {hasCiv && (
        <Box
          w={{ base: '20px', md: '24px' }}
          h={{ base: '20px', md: '24px' }}
          flexShrink={0}
          overflow="hidden"
          mr={1}
        >
          <img
            src={assetManager.getCivIcon(player.civ as string)}
            alt={player.civ as string}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </Box>
      )}

      {/* Player name — link to profile */}
      <Text
        fontSize={{ base: 'xs', md: 'sm' }}
        color="brand.inkDark"
        fontWeight={isHighlighted ? 'bold' : 'semibold'}
        textOverflow="ellipsis"
        overflow="hidden"
        whiteSpace="nowrap"
        flex="1"
        _hover={{ color: 'brand.inkAccent', textDecoration: 'underline' }}
      >
        <RouterLink to={`/profile_id/${player.profile_id}`}>
          {player.name}
        </RouterLink>
      </Text>

      {/* Rating — mono, right-aligned like PlayerRating */}
      {player.rating != null && (
        <Text
          fontWeight="semibold"
          fontSize="xs"
          fontFamily="mono"
          minWidth="4ch"
          textAlign="right"
          color="brand.inkDark"
          ml="auto"
        >
          {player.rating}
        </Text>
      )}
    </Flex>
  );
});

function DiamondMap({ mapName }: { mapName: string }) {
  const [imgError, setImgError] = useState(false);
  const src = imgError ? assetManager.getGenericMapImage() : assetManager.getMapImage(mapName);

  return (
    <Box
      w="44px"
      h="44px"
      flexShrink={0}
      transform="rotate(45deg)"
      overflow="hidden"
      borderRadius="sm"
    >
      <Box
        w="100%"
        h="100%"
        transform="rotate(-45deg) scale(1.42)"
        overflow="hidden"
      >
        <img
          src={src}
          alt={mapName}
          width="44"
          height="44"
          style={{ objectFit: 'cover', width: '100%', height: '100%' }}
          onError={() => setImgError(true)}
        />
      </Box>
    </Box>
  );
}

export const LiveMatchCard = memo(function LiveMatchCard({
  match,
  highlightProfileId,
  avgRating,
}: {
  match: LiveMatch;
  highlightProfileId?: number;
  avgRating?: number | null;
}) {
  const elapsedRef = useRef<HTMLSpanElement>(null);

  // Update elapsed time via DOM ref — no React re-render needed
  useEffect(() => {
    const update = () => {
      if (elapsedRef.current) elapsedRef.current.textContent = formatElapsed(match.start_time);
    };
    update();
    const timer = setInterval(update, 1_000);
    return () => clearInterval(timer);
  }, [match.start_time]);

  return (
    <Box
      bg="brand.cardBg"
      borderWidth="1px"
      borderColor="brand.stone"
      borderRadius="md"
      overflow="hidden"
      mb={3}
    >
      {/* Dark header band */}
      <Flex
        bg="brand.inkDark"
        px={4}
        py={2}
        justify="space-between"
        align="center"
      >
        <Flex align="center" gap={2} minW={0}>
          <Text fontSize="sm" fontWeight="bold" color="brand.parchment" whiteSpace="nowrap">
            {match.game_type}
          </Text>
          <Text fontSize="sm" color="brand.parchment" opacity={0.6} fontStyle="italic" truncate>
            {match.map}
          </Text>
        </Flex>
        <Flex align="center" gap={3} flexShrink={0}>
          <Text
            fontSize="xs"
            color="brand.parchment"
            opacity={0.85}
            fontVariantNumeric="tabular-nums"
            letterSpacing="wide"
          >
            <span ref={elapsedRef} />
          </Text>
          <Text
            fontSize="2xs"
            fontWeight="bold"
            textTransform="uppercase"
            letterSpacing="wider"
            color="brand.parchment"
            bg="brand.redChalk"
            px={2}
            py={0.5}
            borderRadius="full"
            lineHeight="1.2"
            css={{ animation: `${livePulse} 2s ease-in-out infinite` }}
          >
            Live
          </Text>
        </Flex>
      </Flex>

      {/* Body: diamond map + teams (mirrors match history layout) */}
      <Flex px={4} py={2} gap={4} align="flex-start">
        {/* Map column */}
        <VStack gap={1} flexShrink={0} align="center" justify="center" alignSelf="center">
          <DiamondMap mapName={match.map} />
        </VStack>

        {/* Teams — side by side like match history */}
        <Flex flex="1" minW={0} gap={2} direction={{ base: 'column', md: 'row' }} data-testid="teams-container">
          {match.teams.map((team, teamIdx) => {
            let teamStartIdx = 0;
            for (let i = 0; i < teamIdx; i++) teamStartIdx += match.teams[i].length;
            return (
              <Box
                key={teamIdx}
                flex="1"
                minW={0}
                borderWidth="1px"
                borderColor="brand.stone"
                borderRadius="sm"
                overflow="hidden"
              >
                {team.map((player, playerIdx) => (
                  <PlayerRow
                    key={player.profile_id}
                    player={player}
                    isHighlighted={highlightProfileId != null && player.profile_id === highlightProfileId}
                    rowIndex={teamStartIdx + playerIdx}
                  />
                ))}
              </Box>
            );
          })}
        </Flex>
      </Flex>

      {/* Footer */}
      <Flex
        px={4}
        py={1.5}
        justify="flex-end"
        align="center"
        gap={3}
        borderTopWidth="1px"
        borderColor="brand.borderWarm"
      >
        {avgRating != null && (
          <Text fontSize="xs" color="brand.inkMuted" mr="auto">
            ~{avgRating} avg
          </Text>
        )}
        <Link
          href={`aoe2de://1/${match.match_id}`}
          display="flex"
          alignItems="center"
          gap={1}
          fontSize="xs"
          fontWeight="medium"
          color="brand.bronze"
          _hover={{ color: 'brand.redChalk' }}
          textDecoration="none"
          transition="color 0.2s ease"
        >
          <Icon boxSize={3.5}><FiEye /></Icon>
          Spectate
        </Link>
      </Flex>
    </Box>
  );
});

function SkeletonBar({ w, h = '14px' }: { w: string; h?: string }) {
  return (
    <Box
      w={w}
      h={h}
      bg="brand.stoneLight"
      borderRadius="sm"
      css={{ animation: `${skeletonPulse} 1.5s ease-in-out infinite` }}
    />
  );
}

function SkeletonPlayerRow() {
  return (
    <Flex align="center" borderWidth="1px" borderColor="brand.stone" p={1.5}>
      <SkeletonBar w="24px" h="24px" />
      <Box w={1} />
      <SkeletonBar w="100px" />
      <Box flex="1" />
      <SkeletonBar w="30px" />
    </Flex>
  );
}

export function LiveMatchCardSkeleton() {
  return (
    <Box
      bg="brand.cardBg"
      borderWidth="1px"
      borderColor="brand.stone"
      borderRadius="md"
      overflow="hidden"
      mb={3}
    >
      {/* Dark header band placeholder */}
      <Flex
        bg="brand.inkDark"
        px={4}
        py={2}
        justify="space-between"
        align="center"
        opacity={0.6}
      >
        <Flex align="center" gap={2}>
          <SkeletonBar w="60px" h="16px" />
          <SkeletonBar w="80px" h="14px" />
        </Flex>
        <SkeletonBar w="40px" h="18px" />
      </Flex>

      {/* Body: diamond placeholder + team placeholders */}
      <Flex px={4} py={3} gap={4} align="flex-start">
        <VStack gap={1} flexShrink={0} align="center">
          <Box
            w="44px"
            h="44px"
            flexShrink={0}
            transform="rotate(45deg)"
            overflow="hidden"
            borderRadius="sm"
          >
            <Box
              w="100%"
              h="100%"
              bg="brand.stoneLight"
              css={{ animation: `${skeletonPulse} 1.5s ease-in-out infinite` }}
            />
          </Box>
          <SkeletonBar w="40px" h="10px" />
        </VStack>

        <Flex flex="1" minW={0} gap={2} direction={{ base: 'column', md: 'row' }}>
          <VStack gap={0} align="stretch" flex="1">
            <SkeletonPlayerRow />
            <SkeletonPlayerRow />
          </VStack>
          <VStack gap={0} align="stretch" flex="1">
            <SkeletonPlayerRow />
            <SkeletonPlayerRow />
          </VStack>
        </Flex>
      </Flex>

      {/* Footer placeholder */}
      <Flex
        px={4}
        py={2}
        justify="space-between"
        align="center"
        borderTopWidth="1px"
        borderColor="brand.borderWarm"
      >
        <SkeletonBar w="90px" h="12px" />
        <SkeletonBar w="60px" h="14px" />
      </Flex>
    </Box>
  );
}
