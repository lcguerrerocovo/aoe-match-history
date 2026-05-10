import { Box, Flex, HStack, Text, VStack } from '@chakra-ui/react';
import { Tooltip } from '../ui/tooltip';
import { useEffect, useState, useMemo, type ReactNode } from 'react';
import TopBar from '../TopBar';
import { getCivStats } from '../../services/civStatsService';
import { InsightsTab } from './InsightsTab';
import type { CivStatsData, MatchType, CivPatchStats, EloBracket } from '../../types/civStats';

type StatsView = 'winRate' | 'pickRate';
type StatsTab = 'statistics' | 'insights';

const ELO_LABELS: { value: EloBracket; label: string }[] = [
  { value: 'all', label: 'All ELO' },
  { value: '<1000', label: '< 1000' },
  { value: '1000-1500', label: '1000–1500' },
  { value: '1500+', label: '1500+' },
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
  winRateRank: number;
  pickRateRank: number;
  totalGames: number;
  iconUrl: string;
  balanceChanges?: string[];
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
  const civChanges = data.meta.patches.current.civChanges;

  // Build raw rows first
  const raw = Object.entries(civs).map(([name, civ]) => {
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
      curWinRate: current.winRate,
      curPickRate: current.pickRate,
      prevWinRate: previous.winRate,
      prevPickRate: previous.pickRate,
      totalGames: current.totalGames,
      iconUrl: cdnEmblemUrl(name),
      balanceChanges: civChanges?.[name],
    };
  }).filter(r => r.totalGames > 0);

  // Compute rank changes
  const curWrRank = [...raw].sort((a, b) => b.curWinRate - a.curWinRate).reduce((m, r, i) => { m[r.name] = i + 1; return m; }, {} as Record<string, number>);
  const prevWrRank = [...raw].filter(r => r.prevWinRate > 0).sort((a, b) => b.prevWinRate - a.prevWinRate).reduce((m, r, i) => { m[r.name] = i + 1; return m; }, {} as Record<string, number>);
  const curPrRank = [...raw].sort((a, b) => b.curPickRate - a.curPickRate).reduce((m, r, i) => { m[r.name] = i + 1; return m; }, {} as Record<string, number>);
  const prevPrRank = [...raw].filter(r => r.prevPickRate > 0).sort((a, b) => b.prevPickRate - a.prevPickRate).reduce((m, r, i) => { m[r.name] = i + 1; return m; }, {} as Record<string, number>);

  return raw.map(r => ({
    name: r.name,
    winRate: r.curWinRate * 100,
    pickRate: r.curPickRate * 100,
    winRateDelta: (r.curWinRate - r.prevWinRate) * 100,
    pickRateDelta: (r.curPickRate - r.prevPickRate) * 100,
    winRateRank: (prevWrRank[r.name] ?? curWrRank[r.name]) - curWrRank[r.name],
    pickRateRank: (prevPrRank[r.name] ?? curPrRank[r.name]) - curPrRank[r.name],
    totalGames: r.totalGames,
    iconUrl: r.iconUrl,
    balanceChanges: r.balanceChanges,
  }));
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
  if (Math.abs(value) < 0.05) {
    return <Text as="span" fontSize="xs" fontWeight="700" color="brand.inkMuted" whiteSpace="nowrap">—</Text>;
  }
  const isPositive = value > 0;
  return (
    <Text as="span" whiteSpace="nowrap" fontSize="xs" fontWeight="700" color={isPositive ? 'brand.darkWin' : 'brand.darkLoss'}>
      {isPositive ? '+' : ''}{value.toFixed(1)}
    </Text>
  );
}

function RankBadge({ value }: { value: number }) {
  if (value === 0) return <Text as="span" fontSize="xs" fontWeight="700" color="brand.inkMuted" whiteSpace="nowrap">—</Text>;
  const isUp = value > 0;
  return (
    <Text as="span" whiteSpace="nowrap" fontSize="xs" fontWeight="700" color={isUp ? 'brand.darkWin' : 'brand.darkLoss'}>
      <Text as="span" fontSize="6px" verticalAlign="middle">{isUp ? '▲' : '▼'}</Text>{Math.abs(value)}
    </Text>
  );
}

function ChartColumnHeaders() {
  return (
    <Flex align="center" h="18px" px={1} mb={0.5}>
      <Box w="24px" flexShrink={0} />
      <Box w={LABEL_W} flexShrink={0} />
      <Box flex={1} />
      <Text fontSize="2xs" color="brand.inkMuted" fontWeight="600" w="46px" textAlign="right" flexShrink={0} pl={2}>
        Rate
      </Text>
      <Text fontSize="2xs" color="brand.inkMuted" fontWeight="600" w="40px" textAlign="right" flexShrink={0}>
        Δ
      </Text>
      <Text fontSize="2xs" color="brand.inkMuted" fontWeight="600" w="30px" textAlign="right" flexShrink={0}>
        Pos
      </Text>
    </Flex>
  );
}

function formatChange(text: string): ReactNode {
  return text.replace(
    /(\d+[\d.]*%?|\d+[sf]|\d+\/\d+\/\d+\/?\d*)/g,
    '**$1**',
  ).split('**').map((part, i) =>
    i % 2 === 1
      ? <Text key={i} as="span" fontWeight="800" color="brand.inkDark">{part}</Text>
      : part
  );
}

function GeneralChanges({ changes, civCount }: { changes: string[]; civCount: number }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Box mb={3}>
      <Flex
        as="button"
        onClick={() => setExpanded(!expanded)}
        align="center"
        gap={2}
        cursor="pointer"
        py={1.5}
        px={2}
        borderRadius="sm"
        _hover={{ bg: 'brand.stoneLight' }}
        transition="background 0.15s"
      >
        <Text fontSize="xs" color="brand.bronze" fontWeight="bold">
          {expanded ? '▾' : '▸'}
        </Text>
        <Text fontSize="xs" fontWeight="700" color="brand.inkMuted" letterSpacing="wide">
          {changes.length} general balance change{changes.length !== 1 ? 's' : ''} this patch
          {civCount > 0 && <Text as="span" fontWeight="500"> — see highlighted civs below for civ-specific changes</Text>}
        </Text>
      </Flex>
      {expanded && (
        <Box pl={4} pt={1} pb={2}>
          <VStack align="start" gap={1}>
            {changes.map((change, i) => (
              <Flex key={i} gap={1.5} align="baseline">
                <Text as="span" color="brand.bronze" fontSize="xs" lineHeight="1.4">&#x2022;</Text>
                <Text fontSize="xs" color="brand.inkDark" lineHeight="1.4">{formatChange(change)}</Text>
              </Flex>
            ))}
          </VStack>
        </Box>
      )}
    </Box>
  );
}

function BalanceTooltipContent({ changes }: { changes: string[] }) {
  return (
    <VStack align="start" gap={1} py={1}>
      {changes.map((change, i) => (
        <Flex key={i} gap={1.5} align="baseline">
          <Text as="span" color="brand.bronze" fontSize="xs" lineHeight="1.4">&#x2022;</Text>
          <Text fontSize="xs" color="brand.inkDark" lineHeight="1.4">{formatChange(change)}</Text>
        </Flex>
      ))}
    </VStack>
  );
}

function CivRowEl({
  row, barPct, barColor,
  valueText, deltaValue, rankChange, position,
}: {
  row: CivRow;
  barPct: number;
  barColor: string;
  valueText: string;
  deltaValue: number;
  rankChange: number;
  position: number;
}) {
  const hasChanges = row.balanceChanges && row.balanceChanges.length > 0;
  const [expanded, setExpanded] = useState(false);

  const rowContent = (
    <Flex
      h={`${ROW_H}px`}
      align="center"
      _hover={{ bg: { base: 'brand.stoneLight', _dark: 'rgba(255,255,255,0.04)' } }}
      borderRadius="sm"
      transition="all 0.15s"
      px={1}
      cursor={hasChanges ? { base: 'pointer', md: 'help' } : undefined}
      border={hasChanges ? '1px solid' : '1px solid transparent'}
      borderColor={hasChanges ? 'brand.bronze' : 'transparent'}
      bg={hasChanges ? { base: 'rgba(180,140,60,0.06)', _dark: 'rgba(180,140,60,0.08)' } : undefined}
      onClick={hasChanges ? () => setExpanded(prev => !prev) : undefined}
    >
      <Text fontSize="xs" fontWeight="600" color="brand.inkMuted" w="24px" textAlign="right" flexShrink={0} pr={1.5} lineHeight="1">
        {position}
      </Text>

      <Flex align="center" gap={1.5} w={LABEL_W} flexShrink={0} justify="flex-end" pr={2}>
        <Text fontSize="xs" fontWeight={hasChanges ? '700' : '600'} color="brand.inkDark" truncate>
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

      <Text fontSize="xs" fontWeight="800" color="brand.inkDark" w="46px" textAlign="right" flexShrink={0} pl={2}>
        {valueText}
      </Text>

      <Box w="40px" textAlign="right" flexShrink={0}>
        <DeltaBadge value={deltaValue} />
      </Box>

      <Box w="30px" textAlign="right" flexShrink={0}>
        <RankBadge value={rankChange} />
      </Box>
    </Flex>
  );

  return (
    <Box>
      {hasChanges ? (
        <>
          {/* Desktop: tooltip on hover */}
          <Box display={{ base: 'none', md: 'block' }}>
            <Tooltip
              content={<BalanceTooltipContent changes={row.balanceChanges!} />}
              placement="right"
              bg="brand.cardBg"
              color="brand.inkDark"
              border="1px solid"
              borderColor="brand.borderLight"
              borderRadius="md"
              p="8px 12px"
              maxW="320px"
            >
              {rowContent}
            </Tooltip>
          </Box>
          {/* Mobile: click to expand */}
          <Box display={{ base: 'block', md: 'none' }}>
            {rowContent}
          </Box>
          {expanded && (
            <Box
              display={{ md: 'none' }}
              ml={LABEL_W}
              pl={3}
              py={1.5}
              mb={1}
              borderLeft="2px solid"
              borderColor="brand.bronze"
            >
              <BalanceTooltipContent changes={row.balanceChanges!} />
            </Box>
          )}
        </>
      ) : rowContent}
    </Box>
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

      <ChartColumnHeaders />

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
          }}
          display={{ base: 'none', md: 'block' }}
        />

        <VStack gap="1px" align="stretch">
          {sorted.map((row, i) => {
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
                rankChange={row.winRateRank}
                position={i + 1}
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

      <ChartColumnHeaders />

      <VStack gap="1px" align="stretch">
        {sorted.map((row, i) => (
          <CivRowEl
            key={row.name}
            row={row}
            barPct={(row.pickRate / maxPick) * 100}
            barColor="brand.bronze"
            valueText={`${row.pickRate.toFixed(1)}%`}
            deltaValue={row.pickRateDelta}
            rankChange={row.pickRateRank}
            position={i + 1}
          />
        ))}
      </VStack>
    </Box>
  );
}

export function StatsPage() {
  const [activeTab, setActiveTab] = useState<StatsTab>('statistics');
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
    if (selectedMap !== 'all' && !maps.includes(selectedMap)) {
      setSelectedMap('all');
    }
  }, [matchType, eloBracket, maps, selectedMap]);

  const { currentPicks, previousPicks } = useMemo(() => {
    if (!data) return { currentPicks: 0, previousPicks: 0 };
    const section = data[matchType][eloBracket];
    if (!section) return { currentPicks: 0, previousPicks: 0 };

    let curTotal = 0;
    let prevTotal = 0;
    for (const civ of Object.values(section.civs)) {
      if (selectedMap === 'all') {
        curTotal += civ.current.totalGames;
        prevTotal += civ.previous.totalGames;
      } else {
        curTotal += civ.current.maps[selectedMap]?.totalGames ?? 0;
        prevTotal += civ.previous.maps[selectedMap]?.totalGames ?? 0;
      }
    }
    return { currentPicks: curTotal, previousPicks: prevTotal };
  }, [data, matchType, eloBracket, selectedMap]);

  function patchLabel(title: string): string {
    const short = title
      .replace('Age of Empires II: Definitive Edition – ', '')
      .replace(/^Update\s*/i, 'v')
      .replace(/^Minor Update\s*/i, 'v')
      .replace(/^Hotfix\s*/i, 'v');
    return short.startsWith('v') ? short : `v${short}`;
  }

  return (
    <Box minH="100vh" display="flex" flexDirection="column">
      <TopBar />

      <Box flex={1} maxW="960px" w="100%" mx="auto" px={{ base: 2, md: 6 }} py={4}>
        {/* Chapter tabs */}
        <HStack gap={0} mb={4} borderBottom="1px solid" borderColor="brand.borderLight">
          {([
            { key: 'statistics' as const, label: 'Win Rates' },
            { key: 'insights' as const, label: 'Team Positions' },
          ]).map(({ key, label }) => (
            <Box
              key={key}
              as="button"
              onClick={() => setActiveTab(key)}
              px={{ base: 4, md: 6 }}
              py={2.5}
              borderTopRadius="md"
              cursor="pointer"
              transition="all 0.15s ease"
              position="relative"
              bottom="-1px"
              bg={activeTab === key ? { base: 'brand.parchment', _dark: '#1E1E1E' } : 'transparent'}
              border={activeTab === key ? '1px solid' : '1px solid transparent'}
              borderColor={activeTab === key ? 'brand.borderLight' : 'transparent'}
              borderBottom={activeTab === key ? '1px solid' : '1px solid transparent'}
              borderBottomColor={activeTab === key ? { base: 'brand.parchment', _dark: '#1E1E1E' } : 'transparent'}
              _hover={{ color: activeTab === key ? 'brand.inkDark' : 'brand.redChalk' }}
            >
              <Text
                fontSize={{ base: 'sm', md: 'md' }}
                fontWeight={activeTab === key ? 'bold' : '500'}
                color={activeTab === key ? 'brand.inkDark' : 'brand.inkMuted'}
                fontVariantCaps="small-caps"
                letterSpacing="wide"
              >
                {label}
              </Text>
            </Box>
          ))}
        </HStack>

        <VStack align="start" gap={2} mb={4}>
          {activeTab === 'statistics' && data && (
            <Flex gap={3} flexWrap="wrap" align="stretch">
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
                    Current Patch
                  </Text>
                  <Text fontSize="sm" fontWeight="700" color="brand.inkDark" fontFamily="mono">
                    {patchLabel(data.meta.patches.current.title)}
                  </Text>
                  <Text fontSize="2xs" color="brand.inkMuted">{data.meta.patches.current.date}</Text>
                </VStack>
                <Box w="1px" h="32px" bg="brand.inkLight" />
                <VStack gap={0} align="start">
                  <Text fontSize="2xs" color="brand.inkMuted" textTransform="uppercase" letterSpacing="wider" fontWeight="bold">
                    Picks
                  </Text>
                  <Text fontSize="sm" fontWeight="600" color="brand.inkDark">
                    {currentPicks.toLocaleString()}
                  </Text>
                </VStack>
              </Flex>

              <Flex
                gap={3}
                align="center"
                bg="brand.stoneLight"
                border="1px solid"
                borderColor="brand.inkLight"
                borderRadius="md"
                px={3}
                py={2}
                opacity={0.75}
              >
                <VStack gap={0} align="start">
                  <Text fontSize="2xs" color="brand.inkMuted" textTransform="uppercase" letterSpacing="wider" fontWeight="bold">
                    Compared To
                  </Text>
                  <Text fontSize="sm" fontWeight="700" color="brand.inkMuted" fontFamily="mono">
                    {patchLabel(data.meta.patches.previous.title)}
                  </Text>
                  <Text fontSize="2xs" color="brand.inkMuted">{data.meta.patches.previous.date}</Text>
                </VStack>
                <Box w="1px" h="32px" bg="brand.inkLight" />
                <VStack gap={0} align="start">
                  <Text fontSize="2xs" color="brand.inkMuted" textTransform="uppercase" letterSpacing="wider" fontWeight="bold">
                    Picks
                  </Text>
                  <Text fontSize="sm" fontWeight="600" color="brand.inkMuted">
                    {previousPicks.toLocaleString()}
                  </Text>
                </VStack>
              </Flex>
            </Flex>
          )}
        </VStack>

        {activeTab === 'insights' && <InsightsTab />}

        {activeTab === 'statistics' && (
          <>
            {/* General Balance Changes */}
            {data?.meta.patches.current.generalChanges && data.meta.patches.current.generalChanges.length > 0 && (
              <GeneralChanges changes={data.meta.patches.current.generalChanges} civCount={Object.keys(data.meta.patches.current.civChanges ?? {}).length} />
            )}

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

            {data && (
              <Text fontSize="2xs" color="brand.inkMuted" mt={4} textAlign="center">
                Matches with ELO gap &gt; 200 excluded to reduce skill-gap noise
              </Text>
            )}
          </>
        )}
      </Box>
    </Box>
  );
}
