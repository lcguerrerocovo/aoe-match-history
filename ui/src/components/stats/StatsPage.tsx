import { Box, Flex, HStack, Text, VStack } from '@chakra-ui/react';
import { useEffect, useState, useMemo } from 'react';
import TopBar from '../TopBar';
import { getCivStats } from '../../services/civStatsService';
import type { CivStatsData, MatchType, CivPatchStats, EloBracket } from '../../types/civStats';

type StatsView = 'winRate' | 'pickRate';

const ELO_LABELS: { value: EloBracket; label: string }[] = [
  { value: 'all', label: 'All ELO' },
  { value: '<1000', label: '< 1000' },
  { value: '1000-1500', label: '1000–1500' },
  { value: '1500-2000', label: '1500–2000' },
  { value: '2000+', label: '2000+' },
];

const ROW_H = 32;
const LABEL_W = { base: '100px', md: '130px' } as const;
const CDN_BASE = 'https://aoe2.site/assets';

const CIV_EMBLEM_SPECIAL: Record<string, string> = {
  'Lac Viet': 'lacviet.png',
  'Aztec': 'aztecs.png',
  'Macedonians': 'macedonian.png',
};

function cdnEmblemUrl(civName: string): string {
  const filename = CIV_EMBLEM_SPECIAL[civName] ?? `${civName.toLowerCase().replace(/\s+/g, '_')}.png`;
  return `${CDN_BASE}/civ_emblems/${filename}`;
}

interface CivRow {
  name: string;
  winRate: number;
  pickRate: number;
  winRateDelta: number;
  pickRateDelta: number;
  totalGames: number;
  iconUrl: string;
}

function buildCivRows(
  data: CivStatsData,
  matchType: MatchType,
  selectedMap: string,
  eloBracket: EloBracket,
): CivRow[] {
  const section = data[matchType][eloBracket];
  if (!section) return [];
  const civs = section.civs;
  return Object.entries(civs).map(([name, civ]) => {
    let current: Pick<CivPatchStats, 'winRate' | 'pickRate' | 'totalGames'>;
    let previous: Pick<CivPatchStats, 'winRate' | 'pickRate'>;

    if (selectedMap === 'all') {
      current = civ.current;
      previous = civ.previous;
    } else {
      const curMap = civ.current.maps[selectedMap];
      const prevMap = civ.previous.maps[selectedMap];
      current = curMap ?? { winRate: 0, pickRate: 0, totalGames: 0 };
      previous = prevMap ?? { winRate: 0, pickRate: 0 };
    }

    return {
      name,
      winRate: current.winRate * 100,
      pickRate: current.pickRate * 100,
      winRateDelta: (current.winRate - previous.winRate) * 100,
      pickRateDelta: (current.pickRate - previous.pickRate) * 100,
      totalGames: current.totalGames,
      iconUrl: cdnEmblemUrl(name),
    };
  }).filter(r => r.totalGames > 0);
}

function getAvailableMaps(data: CivStatsData, matchType: MatchType, eloBracket: EloBracket): string[] {
  const mapSet = new Set<string>();
  const section = data[matchType][eloBracket];
  if (!section) return [];
  const civs = section.civs;
  for (const civ of Object.values(civs)) {
    for (const mapName of Object.keys(civ.current.maps)) {
      mapSet.add(mapName);
    }
  }
  return Array.from(mapSet).sort();
}

function CivIcon({ row }: { row: CivRow }) {
  return (
    <img
      src={row.iconUrl}
      alt={row.name}
      width={22}
      height={22}
      style={{ flexShrink: 0, objectFit: 'contain' }}
      onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }}
    />
  );
}

function DeltaBadge({ value }: { value: number }) {
  if (Math.abs(value) < 0.05) return null;
  const isPositive = value > 0;
  return (
    <Text
      as="span"
      fontSize="2xs"
      fontWeight="bold"
      color={isPositive ? 'brand.darkWin' : 'brand.darkLoss'}
      whiteSpace="nowrap"
    >
      {isPositive ? '▲' : '▼'}{Math.abs(value).toFixed(1)}
    </Text>
  );
}

function CivRowEl({
  row, barPct, barColor,
  valueText, deltaValue,
}: {
  row: CivRow;
  barPct: number;
  barColor: string;
  valueText: string;
  deltaValue: number;
}) {
  return (
    <Flex
      h={`${ROW_H}px`}
      align="center"
      _hover={{ bg: { base: 'brand.stoneLight', _dark: 'rgba(255,255,255,0.04)' } }}
      borderRadius="sm"
      transition="background 0.1s"
      px={1}
    >
      <Flex align="center" gap={1.5} w={LABEL_W} flexShrink={0} justify="flex-end" pr={2}>
        <Text fontSize="xs" fontWeight="600" color="brand.inkDark" truncate>
          {row.name}
        </Text>
        <CivIcon row={row} />
      </Flex>

      <Box flex={1} h="16px" position="relative" bg={{ base: 'rgba(0,0,0,0.03)', _dark: 'rgba(255,255,255,0.05)' }} borderRadius="2px">
        <Box
          position="absolute"
          left={0}
          top={0}
          h="100%"
          w={`${Math.max(0, Math.min(100, barPct))}%`}
          bg={barColor}
          borderRadius="2px"
          transition="width 0.3s ease"
        />
      </Box>

      <Text fontSize="xs" fontWeight="700" color="brand.inkDark" w="46px" textAlign="right" flexShrink={0} pl={2}>
        {valueText}
      </Text>

      <Box w={{ base: '36px', md: '42px' }} textAlign="right" flexShrink={0}>
        <DeltaBadge value={deltaValue} />
      </Box>
    </Flex>
  );
}

function WinRateChart({ rows }: { rows: CivRow[] }) {
  const sorted = useMemo(
    () => [...rows].sort((a, b) => b.winRate - a.winRate),
    [rows],
  );

  const domainMin = 40;
  const domainMax = 60;
  const refPct = ((50 - domainMin) / (domainMax - domainMin)) * 100;

  return (
    <Box>
      <Flex justify="space-between" align="baseline" mb={3}>
        <Text fontSize="sm" fontWeight="700" color="brand.inkDark" fontVariantCaps="small-caps" letterSpacing="wide">
          Win Rate by Civilization
        </Text>
        <Text fontSize="2xs" color="brand.inkMuted">50% baseline</Text>
      </Flex>

      <Box position="relative">
        {/* 50% reference line — overlays the bar area only */}
        <Box
          position="absolute"
          top={0}
          bottom={0}
          w="1px"
          zIndex={1}
          borderLeft="1px dashed"
          borderColor="brand.inkMuted"
          opacity={0.5}
          style={{
            left: `calc(var(--label-w) + (100% - var(--label-w) - var(--right-w)) * ${refPct / 100})`,
            // CSS vars set on parent aren't trivial with responsive Chakra tokens,
            // so we approximate: label ~130px, right cols ~90px
          }}
          display={{ base: 'none', md: 'block' }}
        />

        <VStack gap="1px" align="stretch">
          {sorted.map((row) => {
            const barPct = ((row.winRate - domainMin) / (domainMax - domainMin)) * 100;
            const isAbove = row.winRate >= 50;

            return (
              <CivRowEl
                key={row.name}
                row={row}
                barPct={barPct}
                barColor={isAbove ? 'brand.darkWin' : 'brand.darkLoss'}
                valueText={`${row.winRate.toFixed(1)}%`}
                deltaValue={row.winRateDelta}
              />
            );
          })}
        </VStack>
      </Box>
    </Box>
  );
}

function PickRateChart({ rows }: { rows: CivRow[] }) {
  const sorted = useMemo(
    () => [...rows].sort((a, b) => b.pickRate - a.pickRate),
    [rows],
  );
  const maxPick = Math.max(...sorted.map(r => r.pickRate), 1);

  return (
    <Box>
      <Flex justify="space-between" align="baseline" mb={3}>
        <Text fontSize="sm" fontWeight="700" color="brand.inkDark" fontVariantCaps="small-caps" letterSpacing="wide">
          Pick Rate by Civilization
        </Text>
        <Text fontSize="2xs" color="brand.inkMuted">{sorted.length} civs</Text>
      </Flex>

      <VStack gap="1px" align="stretch">
        {sorted.map((row) => (
          <CivRowEl
            key={row.name}
            row={row}
            barPct={(row.pickRate / maxPick) * 100}
            barColor="brand.bronze"
            valueText={`${row.pickRate.toFixed(1)}%`}
            deltaValue={row.pickRateDelta}
          />
        ))}
      </VStack>
    </Box>
  );
}

export function StatsPage() {
  const [data, setData] = useState<CivStatsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [matchType, setMatchType] = useState<MatchType>('1v1');
  const [selectedMap, setSelectedMap] = useState('all');
  const [eloBracket, setEloBracket] = useState<EloBracket>('all');
  const [activeView, setActiveView] = useState<StatsView>('winRate');

  useEffect(() => {
    getCivStats().then(setData).catch(e => setError(e.message));
  }, []);

  const maps = useMemo(
    () => (data ? getAvailableMaps(data, matchType, eloBracket) : []),
    [data, matchType, eloBracket],
  );

  const rows = useMemo(
    () => (data ? buildCivRows(data, matchType, selectedMap, eloBracket) : []),
    [data, matchType, selectedMap, eloBracket],
  );

  useEffect(() => {
    setSelectedMap('all');
  }, [matchType, eloBracket]);

  const totalPicks = rows.reduce((s, r) => s + r.totalGames, 0);

  function patchLabel(title: string): string {
    return title
      .replace('Age of Empires II: Definitive Edition – ', '')
      .replace(/^Update\s*/i, '');
  }

  return (
    <Box minH="100vh" display="flex" flexDirection="column">
      <TopBar />

      <Box flex={1} maxW="960px" w="100%" mx="auto" px={{ base: 2, md: 6 }} py={4}>
        {/* Header */}
        <VStack align="start" gap={2} mb={4}>
          <Text
            fontSize={{ base: 'lg', md: 'xl' }}
            fontWeight="bold"
            color="brand.inkDark"
            fontVariantCaps="small-caps"
            letterSpacing="wide"
          >
            Civilization Statistics
          </Text>
          {data && (
            <Flex
              gap={{ base: 3, md: 5 }}
              flexWrap="wrap"
              align="center"
            >
              <VStack gap={0} align="start">
                <Text fontSize="2xs" color="brand.inkMuted" textTransform="uppercase" letterSpacing="wider" fontWeight="bold">
                  Current Patch
                </Text>
                <Text fontSize="sm" color="brand.inkDark" fontWeight="600">
                  {patchLabel(data.meta.patches.current.title)}
                </Text>
              </VStack>
              <VStack gap={0} align="start">
                <Text fontSize="2xs" color="brand.inkMuted" textTransform="uppercase" letterSpacing="wider" fontWeight="bold">
                  Compared To
                </Text>
                <Text fontSize="sm" color="brand.inkDark" fontWeight="600">
                  {patchLabel(data.meta.patches.previous.title)}
                </Text>
              </VStack>
              <VStack gap={0} align="start">
                <Text fontSize="2xs" color="brand.inkMuted" textTransform="uppercase" letterSpacing="wider" fontWeight="bold">
                  Current Picks
                </Text>
                <Text fontSize="sm" color="brand.inkDark" fontWeight="600">
                  {(data.meta.totalPicks[matchType]?.[eloBracket]?.current ?? totalPicks).toLocaleString()}
                </Text>
              </VStack>
              <VStack gap={0} align="start">
                <Text fontSize="2xs" color="brand.inkMuted" textTransform="uppercase" letterSpacing="wider" fontWeight="bold">
                  Previous Picks
                </Text>
                <Text fontSize="sm" color="brand.inkDark" fontWeight="600">
                  {(data.meta.totalPicks[matchType]?.[eloBracket]?.previous ?? 0).toLocaleString()}
                </Text>
              </VStack>
            </Flex>
          )}
        </VStack>

        {/* Controls */}
        <Flex gap={2} mb={4} align="center" flexWrap="wrap">
          <HStack
            bg="brand.stoneLight"
            border="1px solid"
            borderColor="brand.inkLight"
            borderRadius="md"
            p="2px"
            gap="2px"
          >
            {(['1v1', 'team'] as const).map(mt => (
              <Box
                key={mt}
                as="button"
                onClick={() => setMatchType(mt)}
                bg={matchType === mt ? 'brand.parchmentDark' : 'transparent'}
                color={matchType === mt ? 'brand.inkDark' : 'brand.inkMuted'}
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
                boxShadow={matchType === mt ? 'sm' : 'none'}
              >
                {mt === '1v1' ? '1v1' : 'Team'}
              </Box>
            ))}
          </HStack>

          <HStack
            bg="brand.stoneLight"
            border="1px solid"
            borderColor="brand.inkLight"
            borderRadius="md"
            p="2px"
            gap="2px"
          >
            {([
              { key: 'winRate' as const, label: 'Win Rate' },
              { key: 'pickRate' as const, label: 'Pick Rate' },
            ]).map(({ key, label }) => (
              <Box
                key={key}
                as="button"
                onClick={() => setActiveView(key)}
                bg={activeView === key ? 'brand.parchmentDark' : 'transparent'}
                color={activeView === key ? 'brand.inkDark' : 'brand.inkMuted'}
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
                boxShadow={activeView === key ? 'sm' : 'none'}
              >
                {label}
              </Box>
            ))}
          </HStack>

          <select
            value={selectedMap}
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
            <option value="all">All Maps</option>
            {maps.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          <select
            value={eloBracket}
            onChange={e => setEloBracket(e.target.value as EloBracket)}
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
          <Text color="brand.darkLoss" fontSize="sm">Failed to load stats: {error}</Text>
        )}

        {!data && !error && (
          <Text color="brand.inkMuted" fontSize="sm">Loading statistics...</Text>
        )}

        {data && rows.length > 0 && (
          <Box
            bg={{ base: 'brand.parchment', _dark: '#1E1E1E' }}
            border="1px solid"
            borderColor="brand.inkLight"
            borderRadius="md"
            p={{ base: 1, md: 4 }}
            overflow="auto"
          >
            {activeView === 'winRate' ? (
              <WinRateChart rows={rows} />
            ) : (
              <PickRateChart rows={rows} />
            )}
          </Box>
        )}

        {data && rows.length === 0 && (
          <Text color="brand.inkMuted" fontSize="sm">No data available for this selection.</Text>
        )}
      </Box>
    </Box>
  );
}
