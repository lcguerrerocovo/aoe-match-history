import { Box, Text, Flex, HStack } from '@chakra-ui/react';
import { useMemo } from 'react';
import { keyframes } from '@emotion/react';
import type { LiveMatch } from '../../types/liveMatch';

const shimmerWave = keyframes`
  0%, 100% { opacity: 0.2; transform: scaleY(0.7); }
  50% { opacity: 0.5; transform: scaleY(1); }
`;

const ELO_BRACKETS = [
  { label: '< 1000', abbr: '<1k', min: 0, max: 999 },
  { label: '1000–1200', abbr: '1.0–1.2', min: 1000, max: 1199 },
  { label: '1200–1400', abbr: '1.2–1.4', min: 1200, max: 1399 },
  { label: '1400–1600', abbr: '1.4–1.6', min: 1400, max: 1599 },
  { label: '1600–1800', abbr: '1.6–1.8', min: 1600, max: 1799 },
  { label: '1800–2000', abbr: '1.8–2.0', min: 1800, max: 1999 },
  { label: '2000+', abbr: '2k+', min: 2000, max: Infinity },
] as const;

function getAvgRating(match: LiveMatch): number | null {
  const ratings = match.players
    .map((p) => p.rating)
    .filter((r): r is number => r != null && r > 0);
  if (ratings.length === 0) return null;
  return Math.round(ratings.reduce((a, b) => a + b, 0) / ratings.length);
}

function getEloBracketLabel(avgRating: number): string {
  for (const bracket of ELO_BRACKETS) {
    if (avgRating >= bracket.min && avgRating <= bracket.max) return bracket.label;
  }
  return ELO_BRACKETS[ELO_BRACKETS.length - 1].label;
}

interface ActivityPanelProps {
  matches: LiveMatch[];
  avgRatings: Map<number, number | null>;
  ratingsLoaded: boolean;
  selectedMap: string;
  selectedEloBracket: string;
  onMapSelect: (map: string) => void;
  onEloBracketSelect: (bracket: string) => void;
}

export function ActivityPanel({
  matches,
  avgRatings,
  ratingsLoaded,
  selectedMap,
  selectedEloBracket,
  onMapSelect,
  onEloBracketSelect,
}: ActivityPanelProps) {
  const matchCount = matches.length;
  const playerCount = useMemo(
    () => matches.reduce((sum, m) => sum + m.players.length, 0),
    [matches],
  );

  const freshness = useMemo(() => {
    const now = Date.now() / 1000;
    let under5 = 0, under15 = 0, over15 = 0;
    for (const m of matches) {
      const elapsed = now - m.start_time;
      if (elapsed < 300) under5++;
      else if (elapsed < 900) under15++;
      else over15++;
    }
    const total = under5 + under15 + over15;
    return { under5, under15, over15, total };
  }, [matches]);

  // Map counts reflect active ELO filter
  const topMaps = useMemo(() => {
    let source = matches;
    if (selectedEloBracket) {
      source = source.filter((m) => {
        const avg = avgRatings.get(m.match_id);
        return avg != null && getEloBracketLabel(avg) === selectedEloBracket;
      });
    }
    const counts = new Map<string, number>();
    for (const m of source) {
      if (m.map) counts.set(m.map, (counts.get(m.map) || 0) + 1);
    }
    const sorted = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1]);
    const top5 = sorted.slice(0, 5).map(([name, count]) => ({ name, count }));
    const remaining = sorted.slice(5).reduce((sum, [, c]) => sum + c, 0);
    return { top5, remaining, remainingMapCount: Math.max(0, sorted.length - 5) };
  }, [matches, selectedEloBracket, avgRatings]);

  // ELO counts reflect active map filter
  const eloBuckets = useMemo(() => {
    let source = matches;
    if (selectedMap) {
      source = source.filter((m) => m.map === selectedMap);
    }
    const counts = new Map<string, number>();
    let hasAny = false;
    for (const m of source) {
      const avg = avgRatings.get(m.match_id);
      if (avg == null) continue;
      hasAny = true;
      for (const b of ELO_BRACKETS) {
        if (avg >= b.min && avg <= b.max) {
          counts.set(b.label, (counts.get(b.label) || 0) + 1);
          break;
        }
      }
    }
    if (!hasAny) return null;
    return ELO_BRACKETS
      .map((b) => ({ ...b, count: counts.get(b.label) || 0 }))
      .filter((b) => b.count > 0);
  }, [matches, selectedMap, avgRatings]);

  if (matchCount === 0) return null;

  const hasFilter = selectedMap !== '' || selectedEloBracket !== '';
  const maxMapCount = topMaps.top5.length > 0 ? topMaps.top5[0].count : 1;
  const maxEloBucket = eloBuckets ? Math.max(...eloBuckets.map((b) => b.count)) : 1;

  return (
    <Box w="100%" px={4}>
      <Box
        bg="brand.parchmentDark"
        borderWidth="1px"
        borderColor="brand.stone"
        borderRadius="md"
        overflow="hidden"
      >
        <Box bg="brand.cardBg" px={3} py={3}>
          {/* Counts row */}
          <HStack gap={4} mb={3} pb={3} borderBottomWidth="1px" borderColor="brand.stone">
            <HStack gap={1}>
              <Text fontSize="sm" fontWeight="bold" color="brand.inkDark" transition="opacity 0.3s ease">{matchCount}</Text>
              <Text fontSize="xs" color="brand.inkMuted">matches</Text>
            </HStack>
            <HStack gap={1}>
              <Text fontSize="sm" fontWeight="bold" color="brand.inkDark" transition="opacity 0.3s ease">{playerCount}</Text>
              <Text fontSize="xs" color="brand.inkMuted">players</Text>
            </HStack>
            {hasFilter && (
              <Text
                fontSize="2xs"
                color="brand.redChalk"
                cursor="pointer"
                ml="auto"
                _hover={{ textDecoration: 'underline' }}
                onClick={() => { onMapSelect(''); onEloBracketSelect(''); }}
              >
                Clear filters
              </Text>
            )}
          </HStack>

          {/* Top Maps — clickable bars */}
          {topMaps.top5.length > 0 && (
            <Box mb={4}>
              <Text
                fontSize="2xs"
                textTransform="uppercase"
                letterSpacing="wider"
                color="brand.inkMuted"
                fontWeight="bold"
                mb={2}
              >
                Top Maps
              </Text>
              {topMaps.top5.map(({ name, count }) => {
                const isSelected = selectedMap === name;
                const isDimmed = selectedMap !== '' && !isSelected;
                return (
                  <Flex
                    key={name}
                    align="center"
                    mb={1}
                    gap={2}
                    cursor="pointer"
                    opacity={isDimmed ? 0.4 : 1}
                    transition="opacity 0.2s ease"
                    onClick={() => onMapSelect(isSelected ? '' : name)}
                    _hover={{ opacity: isDimmed ? 0.7 : 1 }}
                  >
                    <Text
                      fontSize="xs"
                      color={isSelected ? 'brand.redChalk' : 'brand.inkMedium'}
                      fontWeight={isSelected ? 'bold' : 'normal'}
                      w="100px"
                      textAlign="right"
                      flexShrink={0}
                      overflow="hidden"
                      whiteSpace="nowrap"
                      textOverflow="ellipsis"
                      transition="color 0.2s ease"
                    >
                      {name}
                    </Text>
                    <Box flex="1" h="12px" bg="brand.parchmentDark" borderRadius="sm" overflow="hidden">
                      <Box
                        h="100%"
                        w={`${(count / maxMapCount) * 100}%`}
                        bgGradient="to-r"
                        gradientFrom="brand.redChalk"
                        gradientTo={isSelected ? 'brand.redChalk' : 'brand.bronze'}
                        borderRadius="sm"
                        transition="width 0.5s ease, opacity 0.2s ease"
                      />
                    </Box>
                    <Text fontSize="xs" color="brand.inkMuted" w="30px" textAlign="right" flexShrink={0}>
                      {count}
                    </Text>
                  </Flex>
                );
              })}
              {topMaps.remaining > 0 && (
                <Flex
                  align="center"
                  gap={2}
                  opacity={selectedMap !== '' ? 0.4 : 1}
                  transition="opacity 0.2s ease"
                >
                  <Text
                    fontSize="xs"
                    color="brand.inkMuted"
                    fontStyle="italic"
                    w="100px"
                    textAlign="right"
                    flexShrink={0}
                  >
                    Other ({topMaps.remainingMapCount})
                  </Text>
                  <Box flex="1" h="12px" bg="brand.parchmentDark" borderRadius="sm" overflow="hidden">
                    <Box
                      h="100%"
                      w={`${(topMaps.remaining / maxMapCount) * 100}%`}
                      bgGradient="to-r"
                      gradientFrom="brand.redChalk"
                      gradientTo="brand.bronze"
                      borderRadius="sm"
                      opacity={0.5}
                      transition="width 0.5s ease"
                    />
                  </Box>
                  <Text fontSize="xs" color="brand.inkMuted" w="30px" textAlign="right" flexShrink={0}>
                    {topMaps.remaining}
                  </Text>
                </Flex>
              )}
            </Box>
          )}

          {/* ELO Distribution + Freshness — side by side on desktop */}
          <Flex direction={{ base: 'column', md: 'row' }} gap={6}>
            {/* ELO Distribution — skeleton while loading, histogram when ready */}
            <Box flex="1">
              <Text
                fontSize="2xs"
                textTransform="uppercase"
                letterSpacing="wider"
                color="brand.inkMuted"
                fontWeight="bold"
                mb={2}
              >
                ELO Distribution
              </Text>
              {!ratingsLoaded ? (
                <HStack gap={1} align="flex-end" h="72px">
                  {ELO_BRACKETS.map((b, i) => (
                    <Flex
                      key={b.label}
                      direction="column"
                      align="center"
                      flex="1"
                      h="100%"
                      justify="flex-end"
                    >
                      <Box
                        h={`${[16, 28, 38, 44, 32, 20, 12][i]}px`}
                        bg="brand.stone"
                        borderRadius="sm"
                        w="100%"
                        maxW="32px"
                        transformOrigin="bottom"
                        css={{ animation: `${shimmerWave} 1.8s ease-in-out ${i * 0.15}s infinite` }}
                      />
                      <Text fontSize="2xs" color="brand.inkMuted" mt={1} lineHeight="1" opacity={0.4}>
                        {b.abbr}
                      </Text>
                    </Flex>
                  ))}
                </HStack>
              ) : eloBuckets && eloBuckets.length > 0 ? (
                <HStack gap={1} align="flex-end" h="72px">
                  {eloBuckets.map((b) => {
                    const barH = Math.max((b.count / maxEloBucket) * 48, 4);
                    const isSelected = selectedEloBracket === b.label;
                    const isDimmed = selectedEloBracket !== '' && !isSelected;
                    return (
                      <Flex
                        key={b.label}
                        direction="column"
                        align="center"
                        flex="1"
                        h="100%"
                        justify="flex-end"
                        cursor="pointer"
                        opacity={isDimmed ? 0.4 : 1}
                        transition="opacity 0.2s ease"
                        onClick={() => onEloBracketSelect(isSelected ? '' : b.label)}
                        _hover={{ opacity: isDimmed ? 0.7 : 1 }}
                      >
                        <Box
                          h={`${barH}px`}
                          bgGradient="to-t"
                          gradientFrom="brand.redChalk"
                          gradientTo={isSelected ? 'brand.redChalk' : 'brand.bronze'}
                          borderRadius="sm"
                          w="100%"
                          maxW="32px"
                          transition="height 0.5s ease, opacity 0.2s ease"
                        />
                        <Text
                          fontSize="2xs"
                          color={isSelected ? 'brand.redChalk' : 'brand.inkMuted'}
                          fontWeight={isSelected ? 'bold' : 'normal'}
                          mt={1}
                          lineHeight="1"
                          transition="color 0.2s ease"
                        >
                          {b.abbr}
                        </Text>
                      </Flex>
                    );
                  })}
                </HStack>
              ) : (
                <HStack gap={1} align="flex-end" h="72px" />
              )}
            </Box>

            {/* Match Age — stacked horizontal bar */}
            <Box flex="1">
              <Text
                fontSize="2xs"
                textTransform="uppercase"
                letterSpacing="wider"
                color="brand.inkMuted"
                fontWeight="bold"
                mb={2}
              >
                Match Age
              </Text>
              {freshness.total > 0 && (
                <>
                  <Flex h="20px" borderRadius="sm" overflow="hidden" bg="brand.parchmentDark">
                    {freshness.under5 > 0 && (
                      <Box
                        h="100%"
                        w={`${(freshness.under5 / freshness.total) * 100}%`}
                        bg="brand.darkWin"
                        transition="width 0.5s ease"
                      />
                    )}
                    {freshness.under15 > 0 && (
                      <Box
                        h="100%"
                        w={`${(freshness.under15 / freshness.total) * 100}%`}
                        bg="brand.bronze"
                        transition="width 0.5s ease"
                      />
                    )}
                    {freshness.over15 > 0 && (
                      <Box
                        h="100%"
                        w={`${(freshness.over15 / freshness.total) * 100}%`}
                        bg="brand.inkMuted"
                        opacity={0.5}
                        transition="width 0.5s ease"
                      />
                    )}
                  </Flex>
                  <Flex mt={2} gap={4} flexWrap="wrap">
                    <HStack gap={1.5}>
                      <Box w="8px" h="8px" borderRadius="full" bg="brand.darkWin" flexShrink={0} />
                      <Text fontSize="2xs" color="brand.inkMedium">
                        <Text as="span" fontWeight="bold">{freshness.under5}</Text> &lt;5 min
                      </Text>
                    </HStack>
                    <HStack gap={1.5}>
                      <Box w="8px" h="8px" borderRadius="full" bg="brand.bronze" flexShrink={0} />
                      <Text fontSize="2xs" color="brand.inkMedium">
                        <Text as="span" fontWeight="bold">{freshness.under15}</Text> 5–15 min
                      </Text>
                    </HStack>
                    <HStack gap={1.5}>
                      <Box w="8px" h="8px" borderRadius="full" bg="brand.inkMuted" opacity={0.5} flexShrink={0} />
                      <Text fontSize="2xs" color="brand.inkMedium">
                        <Text as="span" fontWeight="bold">{freshness.over15}</Text> 15+ min
                      </Text>
                    </HStack>
                  </Flex>
                </>
              )}
            </Box>
          </Flex>
        </Box>
      </Box>
    </Box>
  );
}

export { getAvgRating as getMatchAvgRating, getEloBracketLabel, ELO_BRACKETS };
