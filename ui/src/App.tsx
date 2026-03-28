import { Box, VStack, HStack, Text } from '@chakra-ui/react';
import { MatchList } from './components/MatchList';
import { FilterBar } from './components/FilterBar';
import { ProfileHeader } from './components/ProfileHeader';
import { useEffect, useState, useCallback, useRef } from 'react';
import { getFullMatchHistory, getMatches, getPersonalStats, extractSteamId, getSteamAvatar } from './services/matchService';
import type { FilterOptions } from './services/matchService';
import type { Match, MatchGroup, Map, MatchType, SortDirection } from './types/match';
import type { PersonalStats } from './types/stats';
import { useParams } from 'react-router-dom';
import { useLayoutConfig } from './theme/breakpoints';
import { groupMatchesBySession, searchMatches, createFlatMatchGroup, sortMatchesByStart, sortMatchGroupsByDate } from './utils/matchUtils';
import TopBar from './components/TopBar';
import { WatermarkTiled } from './components/Watermark';
import { CornerFlourishes } from './components/CornerFlourishes';
import { ProfileLiveMatch } from './components/ProfileLiveMatch';

function App() {
  const { profileId } = useParams<{ profileId: string }>();
  const [matchGroups, setMatchGroups] = useState<MatchGroup[]>([]);
  const [maps, setMaps] = useState<Map[]>([]);
  const [matchTypes, setMatchTypes] = useState<MatchType[]>([]);
  const [openDates, setOpenDates] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<{ id: string, name: string, avatarUrl?: string, country?: string, clanlist_name?: string } | null>(null);
  const [stats, setStats] = useState<PersonalStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMap, setSelectedMap] = useState('');
  const [selectedMatchType, setSelectedMatchType] = useState('');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [filteredMatches, setFilteredMatches] = useState<Match[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [serverFilterOptions, setServerFilterOptions] = useState<FilterOptions | null>(null);
  // Keep legacy page for backward compat fallback
  const [currentPage, setCurrentPage] = useState(1);
  const layout = useLayoutConfig();

  // Track whether server-side filters are active (map or matchType selected)
  const hasServerFilters = !!(selectedMap || selectedMatchType);

  // Ref to look up matchType ids (comma-separated) from name using server filter options
  const matchTypeIdMapRef = useRef<Record<string, string>>({});
  useEffect(() => {
    if (serverFilterOptions) {
      const idMap: Record<string, string> = {};
      for (const mt of serverFilterOptions.matchTypes) {
        idMap[mt.name] = mt.ids.join(',');
      }
      matchTypeIdMapRef.current = idMap;
    }
  }, [serverFilterOptions]);

  useEffect(() => {
    window.scrollTo(0, 0);
    // Clear filtering state when switching players
    setSearchTerm('');
    setSelectedMap('');
    setSelectedMatchType('');
    setSortDirection('desc');
    setNextCursor(null);
    setServerFilterOptions(null);
  }, [profileId]);

  const updateMatches = useCallback(async () => {
    if (!profileId) return;
    setIsLoading(true);
    setCurrentPage(1);
    setNextCursor(null);
    setHasMore(false);
    try {
      // Try full endpoint first, fall back to legacy if it fails
      const [matchResult, statsData] = await Promise.all([
        getFullMatchHistory(profileId, { limit: 50 }).catch(() =>
          getMatches(profileId).then(data => ({
            matches: data.matches,
            hasMore: false,
            nextCursor: undefined as string | undefined,
            filterOptions: undefined as FilterOptions | undefined,
          }))
        ),
        getPersonalStats(profileId)
      ]);

      // Store all matches for filtering
      setAllMatches(matchResult.matches);
      setHasMore(matchResult.hasMore);
      setNextCursor(matchResult.nextCursor || null);

      // Store server filter options if provided
      if (matchResult.filterOptions) {
        setServerFilterOptions(matchResult.filterOptions);
      }

      // Get Steam avatar if available
      const playerInfo = statsData.statGroups?.[0]?.members?.[0];
      let avatarUrl;
      if (playerInfo?.name) {
        const steamId = extractSteamId(playerInfo.name);
        if (steamId) {
          avatarUrl = await getSteamAvatar(steamId);
        }
      }

      const name = playerInfo?.alias || profileId;
      setProfile({
        id: String(profileId),
        name: String(name),
        avatarUrl,
        country: playerInfo?.country,
        clanlist_name: playerInfo?.clanlist_name
      });
      setStats(statsData);
      setOpenDates([]); // Reset accordion state when profile changes
    } finally {
      setIsLoading(false);
    }
  }, [profileId]);

  const fetchWithServerFilters = useCallback(async (cursor?: string | null) => {
    if (!profileId) return;

    const matchTypeId = selectedMatchType ? matchTypeIdMapRef.current[selectedMatchType] : undefined;

    const result = await getFullMatchHistory(profileId, {
      cursor: cursor || undefined,
      map: selectedMap || undefined,
      matchType: matchTypeId,
      sort: sortDirection,
    });

    return result;
  }, [profileId, selectedMap, selectedMatchType, sortDirection]);

  const loadMoreMatches = useCallback(async () => {
    if (!profileId || isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      if (hasServerFilters && nextCursor) {
        // Cursor-based load more with server filters
        const result = await fetchWithServerFilters(nextCursor);
        if (result) {
          setAllMatches(prev => [...prev, ...result.matches]);
          setHasMore(result.hasMore);
          setNextCursor(result.nextCursor || null);
        }
      } else if (nextCursor) {
        // Cursor-based load more without filters (page 2+)
        const result = await getFullMatchHistory(profileId, {
          limit: 50,
          cursor: nextCursor,
        });
        setAllMatches(prev => [...prev, ...result.matches]);
        setHasMore(result.hasMore);
        setNextCursor(result.nextCursor || null);
      } else {
        // Legacy page-based fallback
        const nextPage = currentPage + 1;
        const result = await getFullMatchHistory(profileId, nextPage, 50);
        setAllMatches(prev => [...prev, ...result.matches]);
        setHasMore(result.hasMore);
        setNextCursor(result.nextCursor || null);
        setCurrentPage(nextPage);
      }
    } catch {
      // Load failed — reset loading state so button reappears for retry
      setHasMore(true);
    } finally {
      setIsLoadingMore(false);
    }
  }, [profileId, currentPage, isLoadingMore, hasMore, nextCursor, hasServerFilters, fetchWithServerFilters]);

  // Effect: when map or matchType filter changes, reset and re-fetch from server
  useEffect(() => {
    if (!profileId) return;
    // Skip the initial render (handled by updateMatches)
    if (!serverFilterOptions) return;

    if (hasServerFilters) {
      // Re-fetch from server with filters
      setIsLoading(true);
      setAllMatches([]);
      setNextCursor(null);
      setHasMore(false);
      fetchWithServerFilters().then(result => {
        if (result) {
          setAllMatches(result.matches);
          setHasMore(result.hasMore);
          setNextCursor(result.nextCursor || null);
        }
      }).catch(() => {
        // Silently fail
      }).finally(() => {
        setIsLoading(false);
      });
    } else {
      // Filters cleared — re-fetch initial data
      updateMatches();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMap, selectedMatchType]);

  // Effect to filter matches when search term or all matches change
  // Map/matchType filtering is now server-side, so only text search is client-side
  useEffect(() => {
    let filtered = allMatches;

    // Apply search filter (always client-side)
    if (searchTerm.trim()) {
      filtered = searchMatches(filtered, searchTerm);
    }

    // When searching by text OR filtering by map/match type, create flat groups (no date accordion)
    const isFlat = Boolean(searchTerm.trim() || selectedMap || selectedMatchType);
    if (isFlat) {
      const sortedFiltered = sortMatchesByStart(filtered, sortDirection);
      setMatchGroups(createFlatMatchGroup(sortedFiltered));
    } else {
      const sessions = groupMatchesBySession(filtered);
      setMatchGroups(sortMatchGroupsByDate(sessions, sortDirection));
    }

    // Store filtered matches for count
    setFilteredMatches(filtered);

    // Update maps and match types with counts
    // When server filter options are available, always use them (total counts across all matches)
    if (serverFilterOptions) {
      setMaps(serverFilterOptions.maps);
      setMatchTypes(serverFilterOptions.matchTypes.map(mt => ({ name: mt.name, count: mt.count })));
    } else {
      setMaps(getMapsWithCounts(filtered));
      setMatchTypes(getMatchTypesWithCounts(filtered));
    }
  }, [allMatches, searchTerm, selectedMap, selectedMatchType, sortDirection, serverFilterOptions]);

  useEffect(() => {
    updateMatches();
  }, [profileId, updateMatches]);

  const getMapsWithCounts = (matches: Match[]): Map[] => {
    return Array.from(
      matches.reduce((acc, match) => {
        acc.set(match.map, (acc.get(match.map) || 0) + 1);
        return acc;
      }, new Map<string, number>())
    )
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  };

  const getMatchTypesWithCounts = (matches: Match[]): MatchType[] => {
    return Array.from(
      matches.reduce((acc, match) => {
        const matchType = match.diplomacy?.type || 'Unknown';
        acc.set(matchType, (acc.get(matchType) || 0) + 1);
        return acc;
      }, new Map<string, number>())
    )
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  };

  const handleMapFilter = (map: string) => {
    setSelectedMap(map);
    // Clear immediately to prevent flash of unfiltered content; effect handles full reset + fetch
    if (map) {
      setAllMatches([]);
      setIsLoading(true);
    }
  };

  const handleMatchTypeFilter = (matchType: string) => {
    setSelectedMatchType(matchType);
    // Clear immediately to prevent flash of unfiltered content; effect handles full reset + fetch
    if (matchType) {
      setAllMatches([]);
      setIsLoading(true);
    }
  };

  const handleSearchChange = (search: string) => {
    setSearchTerm(search);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  const handleSortChange = (direction: SortDirection) => {
    setSortDirection(direction);

    if (hasServerFilters) {
      // Re-fetch from server with new sort direction
      setIsLoading(true);
      setAllMatches([]);
      setNextCursor(null);
      setHasMore(false);

      const matchTypeId = selectedMatchType ? matchTypeIdMapRef.current[selectedMatchType] : undefined;
      getFullMatchHistory(profileId!, {
        map: selectedMap || undefined,
        matchType: matchTypeId,
        sort: direction,
      }).then(result => {
        setAllMatches(result.matches);
        setHasMore(result.hasMore);
        setNextCursor(result.nextCursor || null);
      }).catch(() => {
        // Silently fail
      }).finally(() => {
        setIsLoading(false);
      });
      return;
    }

    const isFlat = Boolean(searchTerm.trim() || selectedMap || selectedMatchType);

    if (isFlat) {
      // In flat mode (searching or filtering), sort matches within the single group
      const sortedFiltered = sortMatchesByStart(filteredMatches, direction);
      setMatchGroups(createFlatMatchGroup(sortedFiltered));
    } else {
      // Session mode: sort groups by date
      setMatchGroups([...matchGroups].sort((a, b) =>
        direction === 'desc' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)
      ));
    }
  };

  // Get search results count for display
  const searchResultsCount = searchTerm.trim() ? filteredMatches.length : undefined;

  return (
    <>
      <TopBar />
      <Box py={{ md: 8 }}>
        <VStack
          gap={1}
          mx="auto"
          px={{ base: 2, lg: 4 }}
          py={{ base: 4, lg: 6 }}
          w="100%"
          maxW={{ md: '90%', xl: '1100px' }}
          bg="brand.parchmentSurface"
          borderRadius={{ base: '0', md: 'sm' }}
          borderWidth={{ base: 0, md: '4px' }}
          borderTopWidth={{ base: 0, md: '4px' }}
          borderColor={{ base: 'transparent', md: 'brand.inkMedium' }}
          data-testid="floating-box-container"
          position="relative"
        >
          <CornerFlourishes />
          <WatermarkTiled />
          {profileId &&
            <Box w="100%">
              <ProfileHeader profileId={profileId} profile={profile} stats={stats} isLoading={isLoading} />
              <Box
                w={layout.matchList.width}
                maxW={layout.matchList.maxWidth}
                mx="auto"
                mt={2}
                mb={4}
              >
                {/* Primary rule with centered star */}
                <HStack gap={3} align="center" w="100%">
                  <Box
                    flex={1}
                    h="1px"
                    bg={{ base: 'linear-gradient(to right, transparent, rgba(139,90,43,0.3))', _dark: 'linear-gradient(to right, transparent, rgba(255,255,255,0.15))' }}
                  />
                  <Text
                    fontSize="xs"
                    color="brand.inkMuted"
                    lineHeight="1"
                    userSelect="none"
                  >
                    ✦
                  </Text>
                  <Box
                    flex={1}
                    h="1px"
                    bg={{ base: 'linear-gradient(to left, transparent, rgba(139,90,43,0.3))', _dark: 'linear-gradient(to left, transparent, rgba(255,255,255,0.15))' }}
                  />
                </HStack>
                {/* Secondary rule — desktop only */}
                <Box
                  h="1px"
                  w="80%"
                  mx="auto"
                  mt="3px"
                  bg={{ base: 'rgba(139,90,43,0.15)', _dark: 'rgba(255,255,255,0.1)' }}
                  display={{ base: 'none', md: 'block' }}
                />
              </Box>
            </Box>
          }
          {profileId && (
            <Box w={layout.matchList.width} maxW={layout.matchList.maxWidth} mx="auto">
              <ProfileLiveMatch profileId={Number(profileId)} />
            </Box>
          )}
          <VStack
            align="stretch"
            p={layout?.mainContent.padding}
            w={layout.matchList.width}
            mx="auto"
          >
            <FilterBar
              onMapChange={handleMapFilter}
              onMatchTypeChange={handleMatchTypeFilter}
              onSortChange={handleSortChange}
              onSearchChange={handleSearchChange}
              onClearSearch={handleClearSearch}
              maps={maps}
              matchTypes={matchTypes}
              searchResultsCount={searchResultsCount}
              searchValue={searchTerm}
              selectedMap={selectedMap}
              selectedMatchType={selectedMatchType}
              sortDirection={sortDirection}
            />
            {profileId && allMatches.length > 0 && (
              <Text
                fontSize="xs"
                color="brand.inkMuted"
                textAlign="center"
                fontStyle="italic"
                py={1}
              >
                Collecting match history since March 22, 2026. Older matches may appear but are not guaranteed.
              </Text>
            )}
            {profileId && (
              <MatchList
                matchGroups={matchGroups}
                openDates={openDates}
                onOpenDatesChange={setOpenDates}
                profileId={profileId}
                hasMore={hasMore}
                isLoadingMore={isLoadingMore}
                onLoadMore={loadMoreMatches}
              />
            )}
          </VStack>
        </VStack>
      </Box>
    </>
  );
}
export default App;
