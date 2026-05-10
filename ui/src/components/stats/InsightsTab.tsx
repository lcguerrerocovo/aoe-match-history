import { Box, Flex, HStack, Text, VStack } from '@chakra-ui/react';
import { useEffect, useState, useMemo } from 'react';
import { getPositionStats } from '../../services/positionStatsService';
import { FormationView } from './FormationView';
import type { PositionStatsData, GameSize, PositionEloBracket } from '../../types/positionStats';

// Wilson score lower bound (95% confidence)
// Ranks civs by the lower end of the confidence interval,
// so high win rate with few games doesn't outrank solid win rate with many games
function wilsonLower(wins: number, n: number): number {
  if (n === 0) return 0;
  const z = 1.96; // 95% confidence
  const p = wins / n;
  const denominator = 1 + (z * z) / n;
  const center = p + (z * z) / (2 * n);
  const spread = z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n);
  return (center - spread) / denominator;
}

const ELO_LABELS: { value: PositionEloBracket; label: string }[] = [
  { value: 'all', label: 'All ELO' },
  { value: '<1000', label: '< 1000' },
  { value: '1000-1500', label: '1000–1500' },
  { value: '1500+', label: '1500+' },
];

function getTopMap(data: PositionStatsData, gameSize: GameSize, eloBracket: PositionEloBracket): string {
  const bracketData = data[gameSize][eloBracket];
  if (!bracketData) return 'Arabia';
  let topMap = 'Arabia';
  let maxGames = 0;
  for (const [mapName, section] of Object.entries(bracketData)) {
    if (section.totalGames > maxGames) {
      maxGames = section.totalGames;
      topMap = mapName;
    }
  }
  return topMap;
}

export function InsightsTab() {
  const [data, setData] = useState<PositionStatsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gameSize, setGameSize] = useState<GameSize>('4v4');
  const [selectedMap, setSelectedMap] = useState<string | null>(null);
  const [eloBracket, setEloBracket] = useState<PositionEloBracket>('all');

  useEffect(() => {
    getPositionStats().then(setData).catch(e => setError(e.message));
  }, []);

  const maps = useMemo(() => {
    if (!data) return [];
    const bracketData = data[gameSize][eloBracket];
    if (!bracketData) return [];
    return Object.entries(bracketData)
      .sort(([, a], [, b]) => b.totalGames - a.totalGames)
      .map(([name]) => name);
  }, [data, gameSize, eloBracket]);

  // Default to top map when data loads or filters change
  const activeMap = useMemo(() => {
    if (!data) return '';
    if (selectedMap && maps.includes(selectedMap)) return selectedMap;
    return getTopMap(data, gameSize, eloBracket);
  }, [data, selectedMap, maps, gameSize, eloBracket]);

  const { flankCivs, pocketCivs, totalGames } = useMemo(() => {
    if (!data || !activeMap) return { flankCivs: [], pocketCivs: [], totalGames: 0 };
    const bracketData = data[gameSize][eloBracket];
    if (!bracketData) return { flankCivs: [], pocketCivs: [], totalGames: 0 };

    const mapData = bracketData[activeMap];
    if (!mapData) return { flankCivs: [], pocketCivs: [], totalGames: 0 };

    const buildFromSection = (section: typeof mapData.pocket) =>
      Object.entries(section.civs)
        .map(([name, stats]) => ({ name, stats, wilson: wilsonLower(stats.wins, stats.totalGames) }))
        .sort((a, b) => b.wilson - a.wilson)
        .slice(0, 4);

    return {
      flankCivs: buildFromSection(mapData.flank),
      pocketCivs: buildFromSection(mapData.pocket),
      totalGames: mapData.totalGames,
    };
  }, [data, gameSize, activeMap, eloBracket]);

  return (
    <>
      {/* Date range info */}
      {data && (
        <Flex gap={3} mb={3} align="center">
          <Flex
            gap={3}
            align="center"
            bg="brand.stoneLight"
            border="1px solid"
            borderColor="brand.inkLight"
            borderRadius="md"
            px={3}
            py={2}
          >
            <VStack gap={0} align="start">
              <Text fontSize="2xs" color="brand.inkMuted" textTransform="uppercase" letterSpacing="wider" fontWeight="bold">
                Period
              </Text>
              <Text fontSize="sm" fontWeight="700" color="brand.inkDark" fontFamily="mono">
                Last 6 months
              </Text>
            </VStack>
            <Box w="1px" h="24px" bg="brand.inkLight" />
            <VStack gap={0} align="start">
              <Text fontSize="2xs" color="brand.inkMuted" textTransform="uppercase" letterSpacing="wider" fontWeight="bold">
                Matches
              </Text>
              <Text fontSize="sm" fontWeight="600" color="brand.inkDark">
                {totalGames.toLocaleString()}
              </Text>
            </VStack>
          </Flex>
        </Flex>
      )}

      {/* Filters */}
      <Flex gap={2} mb={4} align="center" flexWrap="wrap">
        <HStack
          bg="brand.stoneLight"
          border="1px solid"
          borderColor="brand.inkLight"
          borderRadius="md"
          p="2px"
          gap="2px"
        >
          {(['3v3', '4v4'] as const).map(gs => (
            <Box
              key={gs}
              as="button"
              onClick={() => setGameSize(gs)}
              bg={gameSize === gs ? 'brand.parchmentDark' : 'transparent'}
              color={gameSize === gs ? 'brand.inkDark' : 'brand.inkMuted'}
              px={3}
              py={1}
              borderRadius="sm"
              fontSize="xs"
              fontWeight="bold"
              textTransform="uppercase"
              letterSpacing="wide"
              cursor="pointer"
              _hover={{ color: 'brand.redChalk' }}
              transition="all 0.15s ease"
              boxShadow={gameSize === gs ? 'sm' : 'none'}
            >
              {gs}
            </Box>
          ))}
        </HStack>

        <select
          value={activeMap}
          onChange={e => setSelectedMap(e.target.value)}
          style={{
            background: 'var(--chakra-colors-brand-stoneLight)',
            border: '1px solid var(--chakra-colors-brand-inkLight)',
            borderRadius: '6px',
            padding: '4px 12px',
            fontSize: '11px',
            fontWeight: 'bold',
            color: 'var(--chakra-colors-brand-inkDark)',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {maps.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        <select
          value={eloBracket}
          onChange={e => setEloBracket(e.target.value as PositionEloBracket)}
          style={{
            background: 'var(--chakra-colors-brand-stoneLight)',
            border: '1px solid var(--chakra-colors-brand-inkLight)',
            borderRadius: '6px',
            padding: '4px 12px',
            fontSize: '11px',
            fontWeight: 'bold',
            color: 'var(--chakra-colors-brand-inkDark)',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {ELO_LABELS.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </Flex>

      {/* Content */}
      {error && (
        <Text color="brand.darkLoss" fontSize="sm">Failed to load position stats: {error}</Text>
      )}

      {!data && !error && (
        <Text color="brand.inkMuted" fontSize="sm">Loading position stats...</Text>
      )}

      {data && (flankCivs.length > 0 || pocketCivs.length > 0) && (
        <Box
          bg={{ base: 'brand.parchment', _dark: '#1E1E1E' }}
          border="1px solid"
          borderColor="brand.inkLight"
          borderRadius="md"
          p={{ base: 2, md: 4 }}
          overflow="hidden"
        >
          <Text fontSize="sm" fontWeight="700" color="brand.inkDark" fontVariantCaps="small-caps" letterSpacing="wide" mb={2} textAlign="center">
            Top Civilizations by Position — {gameSize}
          </Text>
          <FormationView
            flankCivs={flankCivs}
            pocketCivs={pocketCivs}
            mapName={activeMap}
            gameSize={gameSize}
          />
        </Box>
      )}

      {data && flankCivs.length === 0 && pocketCivs.length === 0 && (
        <Text color="brand.inkMuted" fontSize="sm">No position data available for this selection.</Text>
      )}

      {data && (
        <VStack gap={1} mt={4}>
          <Text fontSize="2xs" color="brand.inkMuted" textAlign="center">
            Last 6 months — maps with &lt; 1,500 games excluded — civs with &lt; 1% pick rate excluded — maps without fixed positions excluded
          </Text>
          <Text fontSize="2xs" color="brand.inkMuted" textAlign="center">
            Ranked by Wilson score (W) — a statistical lower bound that balances win rate with sample size.
            A civ with 53% over 5,000 games ranks above 56% over 200 games because the confidence is higher.
          </Text>
        </VStack>
      )}
    </>
  );
}
