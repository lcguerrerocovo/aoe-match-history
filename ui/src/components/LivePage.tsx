import { Box, VStack, Text, Flex, HStack, Input } from '@chakra-ui/react';
import { useEffect, useState, useRef, useMemo, useCallback, memo } from 'react';
import { keyframes } from '@emotion/react';
import TopBar from './TopBar';
import { LiveMatchCard, LiveMatchCardSkeleton, PulsingDot } from './LiveMatchCard';
import { ActivityPanel, getMatchAvgRating, getEloBracketLabel } from './live';
import { getLiveMatches } from '../services/liveMatchService';
import type { LiveMatch } from '../types/liveMatch';

const cardEnter = keyframes`
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
`;

const cardFlash = keyframes`
  0% { background-color: transparent; }
  30% { background-color: var(--chakra-colors-brand-parchmentDark); }
  100% { background-color: transparent; }
`;

const REFRESH_INTERVAL_MS = 30_000;

const GAME_TYPE_CATEGORIES = ['All', 'RM 1v1', 'RM Team', 'QM RM', 'QM RM Team', 'EW 1v1', 'EW Team', 'QM EW', 'QM EW Team', 'Other'] as const;
type GameTypeCategory = typeof GAME_TYPE_CATEGORIES[number];

function categorizeMatchType(matchtypeId: number): GameTypeCategory {
  switch (matchtypeId) {
    case 6: return 'RM 1v1';
    case 7: case 8: case 9: return 'RM Team';
    case 18: return 'QM RM';                           // Quick Match RM
    case 19: case 20: case 21: return 'QM RM Team';   // Quick Match RM Team
    case 26: return 'EW 1v1';
    case 27: case 28: case 29: return 'EW Team';
    case 11: return 'QM EW';                           // Quick Match EW
    case 12: case 13: case 14: return 'QM EW Team';   // Quick Match EW Team
    default: return 'Other';
  }
}

const GameTypeTabs = memo(function GameTypeTabs({
  matches,
  selected,
  onSelect,
}: {
  matches: LiveMatch[];
  selected: GameTypeCategory;
  onSelect: (cat: GameTypeCategory) => void;
}) {
  const counts = useMemo(() => {
    const map = new Map<GameTypeCategory, number>();
    map.set('All', matches.length);
    for (const m of matches) {
      const cat = categorizeMatchType(m.matchtype_id);
      map.set(cat, (map.get(cat) || 0) + 1);
    }
    return map;
  }, [matches]);

  return (
    <HStack gap={0} w="100%" px={4} overflowX="auto" flexWrap="nowrap">
      {GAME_TYPE_CATEGORIES.map((cat) => {
        const count = counts.get(cat) || 0;
        const isActive = selected === cat;
        if (cat !== 'All' && count === 0) return null;
        return (
          <Box
            key={cat}
            as="button"
            px={4}
            py={3}
            fontSize="sm"
            fontWeight="bold"
            textTransform="uppercase"
            letterSpacing="wider"
            color={isActive ? 'brand.redChalk' : 'brand.inkMuted'}
            borderBottomWidth="3px"
            borderColor={isActive ? 'brand.redChalk' : 'transparent'}
            bg="transparent"
            cursor="pointer"
            transition="all 0.2s ease"
            _hover={{ color: 'brand.inkDark' }}
            whiteSpace="nowrap"
            onClick={() => onSelect(cat)}
          >
            {cat} ({count})
          </Box>
        );
      })}
    </HStack>
  );
});

export function LivePage() {
  const [matches, setMatches] = useState<LiveMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<GameTypeCategory>('All');
  const [selectedMap, setSelectedMap] = useState('');
  const [selectedEloBracket, setSelectedEloBracket] = useState('');
  const [civFilter, setCivFilter] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevMatchIdsRef = useRef<Set<number>>(new Set());
  const [newMatchIds, setNewMatchIds] = useState<Set<number>>(new Set());

  // Reset map/ELO filters when game type tab changes
  const handleCategorySelect = useCallback((cat: GameTypeCategory) => {
    setSelectedCategory(cat);
    setSelectedMap('');
    setSelectedEloBracket('');
    setCivFilter('');
  }, []);

  // Pre-compute avg ratings ONCE for all matches — shared across all filter chains
  const allAvgRatings = useMemo(() => {
    const map = new Map<number, number | null>();
    for (const m of matches) {
      map.set(m.match_id, getMatchAvgRating(m));
    }
    return map;
  }, [matches]);

  // Matches filtered by game type tab only (used for filter option counts)
  const categoryFilteredMatches = useMemo(() => {
    if (selectedCategory === 'All') return matches;
    return matches.filter((m) => categorizeMatchType(m.matchtype_id) === selectedCategory);
  }, [matches, selectedCategory]);

  // Available civs — from matches already filtered by map + ELO (but not civ itself)
  const civOptions = useMemo(() => {
    let source = categoryFilteredMatches;
    if (selectedMap) {
      source = source.filter((m) => m.map === selectedMap);
    }
    if (selectedEloBracket) {
      source = source.filter((m) => {
        const avg = allAvgRatings.get(m.match_id);
        return avg != null && getEloBracketLabel(avg) === selectedEloBracket;
      });
    }
    const civs = new Set<string>();
    for (const m of source) {
      for (const p of m.players) {
        if (p.civ && String(p.civ) !== '0') civs.add(String(p.civ));
      }
    }
    return Array.from(civs).sort();
  }, [categoryFilteredMatches, selectedMap, selectedEloBracket, allAvgRatings]);

  // Civ suggestions filtered by typed text
  const civSuggestions = useMemo(() => {
    if (!civFilter) return civOptions;
    const lower = civFilter.toLowerCase();
    return civOptions.filter(c => c.toLowerCase().includes(lower));
  }, [civOptions, civFilter]);

  // Full filter pipeline: game type → map → ELO bracket → civ
  const filteredMatches = useMemo(() => {
    let result = categoryFilteredMatches;
    if (selectedMap) {
      result = result.filter((m) => m.map === selectedMap);
    }
    if (selectedEloBracket) {
      result = result.filter((m) => {
        const avg = allAvgRatings.get(m.match_id);
        return avg != null && getEloBracketLabel(avg) === selectedEloBracket;
      });
    }
    if (civFilter) {
      const lower = civFilter.toLowerCase();
      result = result.filter((m) =>
        m.players.some((p) => String(p.civ).toLowerCase().includes(lower)),
      );
    }
    return result;
  }, [categoryFilteredMatches, selectedMap, selectedEloBracket, civFilter, allAvgRatings]);

  const hasActiveFilters = selectedMap !== '' || selectedEloBracket !== '' || civFilter !== '';

  const fetchingRef = useRef(false);

  const fetchMatches = useCallback(async () => {
    if (fetchingRef.current) return; // skip if previous fetch still in-flight
    fetchingRef.current = true;
    try {
      const data = await getLiveMatches();
      // Detect newly appeared matches for enter animation
      const prev = prevMatchIdsRef.current;
      if (prev.size > 0) {
        const fresh = new Set(data.filter(m => !prev.has(m.match_id)).map(m => m.match_id));
        if (fresh.size > 0) setNewMatchIds(fresh);
      }
      prevMatchIdsRef.current = new Set(data.map(m => m.match_id));
      setMatches(data);
      setError(null);
      setIsLoading(false);
    } catch (err) {
      // Ignore aborted fetches (superseded by a newer request)
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Failed to load live matches');
      setIsLoading(false);
    } finally {
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchMatches();
    intervalRef.current = setInterval(fetchMatches, REFRESH_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchMatches]);

  return (
    <>
      <TopBar />
      <Box py={{ md: 8 }}>
        <VStack
          gap={4}
          mx="auto"
          px={{ base: 2, lg: 4 }}
          maxW={{ md: '90%', xl: '1100px' }}
        >
          {/* Page header — centered */}
          <VStack gap={1} pt={4} w="100%">
            <Flex align="center" gap={2} justify="center">
              {!isLoading && matches.length > 0 && <PulsingDot />}
              <Text
                fontSize={{ base: 'xl', md: '2xl' }}
                fontWeight="bold"
                color="brand.inkDark"
                letterSpacing="wide"
              >
                Live Matches
              </Text>
            </Flex>
            <Text fontSize="sm" color="brand.inkMuted" fontStyle="italic">
              {isLoading
                ? ''
                : matches.length > 0
                  ? `${matches.reduce((sum, m) => sum + m.players.length, 0)} players in ${matches.length} match${matches.length !== 1 ? 'es' : ''}`
                  : ''}
            </Text>
          </VStack>

          {/* Game type tabs */}
          {!isLoading && matches.length > 0 && (
            <GameTypeTabs
              matches={matches}
              selected={selectedCategory}
              onSelect={handleCategorySelect}
            />
          )}

          {/* Activity metrics panel (map + ELO filters built in) */}
          {!isLoading && categoryFilteredMatches.length > 0 && (
            <ActivityPanel
              key={selectedCategory}
              matches={categoryFilteredMatches}
              avgRatings={allAvgRatings}
              selectedMap={selectedMap}
              selectedEloBracket={selectedEloBracket}
              onMapSelect={setSelectedMap}
              onEloBracketSelect={setSelectedEloBracket}
            />
          )}

          {/* Civ filter */}
          {!isLoading && matches.length > 0 && (
            <Flex gap={4} px={4} w="100%" align="flex-end" flexWrap="wrap">
              <Box position="relative" w={{ base: '160px', md: '200px' }}>
                <Text
                  fontSize="2xs"
                  textTransform="uppercase"
                  letterSpacing="wider"
                  color="brand.inkMuted"
                  fontWeight="bold"
                  mb={0.5}
                  lineHeight="1"
                >
                  Civilization
                </Text>
                <Input
                  value={civFilter}
                  onChange={(e) => setCivFilter(e.target.value)}
                  placeholder="Type to filter..."
                  fontSize={{ base: 'xs', md: 'sm' }}
                  bg="transparent"
                  borderWidth="0 0 1px 0"
                  borderColor="brand.borderWarm"
                  borderRadius="0"
                  px={0}
                  h="auto"
                  py={1}
                  _focus={{
                    borderColor: 'brand.redChalk',
                    borderWidth: '0 0 2px 0',
                    bg: 'transparent',
                    outline: 'none',
                    boxShadow: 'none',
                  }}
                  list="civ-options"
                />
                <datalist id="civ-options">
                  {civSuggestions.map((civ) => (
                    <option key={civ} value={civ} />
                  ))}
                </datalist>
              </Box>
              {hasActiveFilters && (
                <Text fontSize="xs" color="brand.inkMuted" fontStyle="italic" ml="auto">
                  Showing {filteredMatches.length} of {categoryFilteredMatches.length}
                </Text>
              )}
            </Flex>
          )}

          {/* Content */}
          {isLoading && (
            <Box w="100%">
              {Array.from({ length: 4 }).map((_, i) => (
                <LiveMatchCardSkeleton key={i} />
              ))}
            </Box>
          )}

          {error && !isLoading && (
            <Box py={16} textAlign="center">
              <Text fontSize="lg" color="brand.redChalk" fontStyle="italic">
                The scouts have lost their signal
              </Text>
              <Box w="60px" h="1px" bg="brand.borderWarm" mx="auto" my={4} />
              <Text fontSize="xs" color="brand.inkMuted">
                Matches will return when the connection is restored
              </Text>
            </Box>
          )}

          {!isLoading && !error && matches.length === 0 && (
            <Box py={20} textAlign="center">
              <Text color="brand.inkMuted" fontSize="lg" fontStyle="italic">
                No battles rage at this hour
              </Text>
              <Box w="60px" h="1px" bg="brand.borderWarm" mx="auto" my={4} />
              <Text color="brand.inkMuted" fontSize="xs">
                Matches refresh automatically every 30 seconds
              </Text>
            </Box>
          )}

          {!isLoading && filteredMatches.length > 0 && (
            <Box w="100%">
              {filteredMatches.map((match) => {
                const isNew = newMatchIds.has(match.match_id);
                return (
                  <Box
                    key={match.match_id}
                    css={isNew ? {
                      animation: `${cardEnter} 0.4s ease-out, ${cardFlash} 1.2s ease-out`,
                    } : undefined}
                    onAnimationEnd={(e) => {
                      // Only act on the longer animation (cardFlash 1.2s) to avoid double state updates
                      if (isNew && e.animationName === cardFlash.name) {
                        setNewMatchIds(prev => {
                          const next = new Set(prev);
                          next.delete(match.match_id);
                          return next;
                        });
                      }
                    }}
                  >
                    <LiveMatchCard
                      match={match}
                      avgRating={allAvgRatings.get(match.match_id)}
                    />
                  </Box>
                );
              })}
            </Box>
          )}

          {!isLoading && matches.length > 0 && filteredMatches.length === 0 && (
            <Box py={12} textAlign="center">
              <Text color="brand.inkMuted" fontSize="sm" fontStyle="italic">
                No matches for these filters
              </Text>
              <Text color="brand.inkMuted" fontSize="xs" mt={1}>
                Try broadening your search
              </Text>
            </Box>
          )}

          {/* Footer */}
          {!isLoading && matches.length > 0 && (
            <Text fontSize="xs" color="brand.inkMuted" fontStyle="italic" textAlign="center" py={2}>
              Refreshes every 30 seconds
            </Text>
          )}
        </VStack>
      </Box>
    </>
  );
}
