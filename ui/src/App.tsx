import { Box, VStack, Text } from '@chakra-ui/react';
import { MatchList } from './components/MatchList';
import { FilterBar } from './components/FilterBar';
import { ProfileHeader } from './components/ProfileHeader';
import { useEffect, useState, useCallback } from 'react';
import { getFullMatchHistory, getMatches, getPersonalStats, extractSteamId, getSteamAvatar } from './services/matchService';
import type { Match, MatchGroup, Map, MatchType, SortDirection } from './types/match';
import type { PersonalStats } from './types/stats';
import { useParams } from 'react-router-dom';
import { useLayoutConfig } from './theme/breakpoints';
import { groupMatchesBySession, searchMatches, createFlatMatchGroup, sortMatchesByStart, sortMatchGroupsByDate } from './utils/matchUtils';
import TopBar from './components/TopBar';
import { WatermarkTiled } from './components/Watermark';
import { CornerFlourishes } from './components/CornerFlourishes';

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
  const [currentPage, setCurrentPage] = useState(1);
  const layout = useLayoutConfig();

  useEffect(() => {
    window.scrollTo(0, 0);
    // Clear filtering state when switching players
    setSearchTerm('');
    setSelectedMap('');
    setSelectedMatchType('');
    setSortDirection('desc');
  }, [profileId]);

  const updateMatches = useCallback(async () => {
    if (!profileId) return;
    setIsLoading(true);
    setCurrentPage(1);
    setHasMore(false);
    try {
      // Try full endpoint first, fall back to legacy if it fails
      const [matchResult, statsData] = await Promise.all([
        getFullMatchHistory(profileId, 1, 50).catch(() =>
          getMatches(profileId).then(data => ({ matches: data.matches, hasMore: false }))
        ),
        getPersonalStats(profileId)
      ]);

      // Store all matches for filtering
      setAllMatches(matchResult.matches);
      setHasMore(matchResult.hasMore);
      
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

  const loadMoreMatches = useCallback(async () => {
    if (!profileId || isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const result = await getFullMatchHistory(profileId, nextPage, 50);
      setAllMatches(prev => [...prev, ...result.matches]);
      setHasMore(result.hasMore);
      setCurrentPage(nextPage);
    } finally {
      setIsLoadingMore(false);
    }
  }, [profileId, currentPage, isLoadingMore, hasMore]);

  // Effect to filter matches when search term, selected map, selected match type, or all matches change
  useEffect(() => {
    let filtered = allMatches;
    
    // Apply map filter
    if (selectedMap) {
      filtered = filtered.filter(match => match.map === selectedMap);
    }
    
    // Apply match type filter
    if (selectedMatchType) {
      filtered = filtered.filter(match => match.diplomacy?.type === selectedMatchType);
    }
    
    // Apply search filter
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
    
    // Update maps and match types with counts based on filtered results
    setMaps(getMapsWithCounts(filtered));
    setMatchTypes(getMatchTypesWithCounts(filtered));
  }, [allMatches, searchTerm, selectedMap, selectedMatchType, sortDirection]);

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
  };

  const handleMatchTypeFilter = (matchType: string) => {
    setSelectedMatchType(matchType);
  };

  const handleSearchChange = (search: string) => {
    setSearchTerm(search);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  const handleSortChange = (direction: SortDirection) => {
    setSortDirection(direction);

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
            </Box>
          }
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
            {profileId && allMatches.length > 0 && hasMore && (
              <Text
                fontSize="xs"
                color="brand.inkMuted"
                textAlign="center"
                fontStyle="italic"
                py={1}
              >
                Collecting match history since March 2026
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

