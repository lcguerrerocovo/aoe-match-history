import { Box, Flex, Text } from '@chakra-ui/react';
import { CivPositionCard } from './CivPositionCard';
import { PLAYER_COLORS } from '../../utils/playerColors';
import { assetManager } from '../../utils/assetManager';
import type { PositionCivStats } from '../../types/positionStats';

export interface FormationCiv {
  name: string;
  stats: PositionCivStats;
  wilson: number;
}

interface FormationViewProps {
  flankCivs: FormationCiv[];
  pocketCivs: FormationCiv[];
  mapName: string;
  gameSize: '3v3' | '4v4';
}

// AoE2 position colors for the strip indicators
// 4v4 team1: 1(blue) 3(green) 5(cyan) 7(grey) — flanks=1,7 pocket=3,5
// 4v4 team2: 2(red) 4(yellow) 6(purple) 8(orange) — flanks=2,8 pocket=4,6
// 3v3 team1: 1(blue) 3(green) 5(cyan) — flanks=1,3 pocket=5
// 3v3 team2: 2(red) 4(yellow) 6(purple) — flanks=2,6 pocket=4
// 3v3 uses blue team (odd colors): 1=blue(flank), 3=green(pocket), 5=cyan(flank)
// 4v4 uses red team (even colors): 2=red(flank), 4=yellow(pocket), 6=purple(pocket), 8=orange(flank)
const STRIP_COLORS = {
  '3v3': {
    leftFlank: PLAYER_COLORS[1],    // blue
    rightFlank: PLAYER_COLORS[5],   // cyan
    pocketLeft: PLAYER_COLORS[3],   // green
    pocketRight: PLAYER_COLORS[3],  // green (single pocket seat)
  },
  '4v4': {
    leftFlank: PLAYER_COLORS[2],    // red
    rightFlank: PLAYER_COLORS[8],   // orange
    pocketLeft: PLAYER_COLORS[4],   // yellow
    pocketRight: PLAYER_COLORS[6],  // purple
  },
};

export function FormationView({ flankCivs, pocketCivs, mapName, gameSize }: FormationViewProps) {
  // Zigzag: #1 left, #2 right, #3 left, #4 right
  const leftFlanks = [flankCivs[0], flankCivs[2]].filter(Boolean);
  const rightFlanks = [flankCivs[1], flankCivs[3]].filter(Boolean);
  const leftPockets = [pocketCivs[0], pocketCivs[2]].filter(Boolean);
  const rightPockets = [pocketCivs[1], pocketCivs[3]].filter(Boolean);
  const colors = STRIP_COLORS[gameSize];

  const DIAMOND_SIZE = { base: 280, md: 400 };

  return (
    <Box position="relative" maxW="720px" mx="auto" pt={10} pb={4}>
      {/* Diamond map background with border */}
      <Box
        position="absolute"
        top="40%"
        left="50%"
        transform="translate(-50%, -50%)"
        w={{ base: `${Math.round(DIAMOND_SIZE.base * 1.414)}px`, md: `${Math.round(DIAMOND_SIZE.md * 1.414)}px` }}
        h={{ base: `${Math.round(DIAMOND_SIZE.base * 1.414)}px`, md: `${Math.round(DIAMOND_SIZE.md * 1.414)}px` }}
        clipPath="polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)"
        zIndex={0}
        overflow="hidden"
      >
        <Box
          position="absolute"
          inset="0"
          boxShadow="inset 0 0 0 1px var(--chakra-colors-brand-borderLight)"
        />
        <img
          src={assetManager.getMapImage(mapName)}
          alt={mapName}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.25,
          }}
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      </Box>

      {/* Formation content */}
      <Flex
        position="relative"
        zIndex={1}
        direction="column"
        align="center"
      >
        {/* Empty top area — opposing team space */}
        <Box h={{ base: '40px', md: '60px' }} />

        {/* Flanks — positioned at diamond sides, spread wide */}
        <Flex w="100%" justify="space-between">
          {/* Left flank */}
          <Flex direction="column" align="center" gap={3}>
            <Text
              fontSize="2xs"
              color="brand.inkMuted"
              fontWeight="700"
              textTransform="uppercase"
              letterSpacing="widest"
            >
              Flank
            </Text>
            {leftFlanks.map((civ, i) => (
              <CivPositionCard
                key={civ.name}
                rank={i * 2 + 1}
                civName={civ.name}
                winRate={civ.stats.winRate}
                totalGames={civ.stats.totalGames}
                wilson={civ.wilson}
                stripColor={colors.leftFlank}
                stripSide="left"
              />
            ))}
          </Flex>

          {/* Right flank */}
          <Flex direction="column" align="center" gap={3}>
            <Text
              fontSize="2xs"
              color="brand.inkMuted"
              fontWeight="700"
              textTransform="uppercase"
              letterSpacing="widest"
            >
              Flank
            </Text>
            {rightFlanks.map((civ, i) => (
              <CivPositionCard
                key={civ.name}
                rank={i * 2 + 2}
                civName={civ.name}
                winRate={civ.stats.winRate}
                totalGames={civ.stats.totalGames}
                wilson={civ.wilson}
                stripColor={colors.rightFlank}
                stripSide="right"
              />
            ))}
          </Flex>
        </Flex>

        {/* Pocket — bottom of diamond */}
        <Box mt={{ base: 4, md: 6 }}>
          <Text
            fontSize="2xs"
            color="brand.inkMuted"
            fontWeight="700"
            textTransform="uppercase"
            letterSpacing="widest"
            textAlign="center"
            mb={3}
          >
            Pocket
          </Text>

          <Flex gap={{ base: 4, md: 6 }} justify="center">
            <Flex direction="column" gap={3} align="center">
              {leftPockets.map((civ, i) => (
                <CivPositionCard
                  key={civ.name}
                  rank={i * 2 + 1}
                  civName={civ.name}
                  winRate={civ.stats.winRate}
                  totalGames={civ.stats.totalGames}
                  wilson={civ.wilson}
                  stripColor={colors.pocketLeft}
                  stripSide="left"
                />
              ))}
            </Flex>
            <Flex direction="column" gap={3} align="center">
              {rightPockets.map((civ, i) => (
                <CivPositionCard
                  key={civ.name}
                  rank={i * 2 + 2}
                  civName={civ.name}
                  winRate={civ.stats.winRate}
                  totalGames={civ.stats.totalGames}
                  wilson={civ.wilson}
                  stripColor={colors.pocketRight}
                  stripSide="right"
                />
              ))}
            </Flex>
          </Flex>
        </Box>
      </Flex>
    </Box>
  );
}
