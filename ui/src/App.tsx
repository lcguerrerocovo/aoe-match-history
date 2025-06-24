import { Box, VStack } from '@chakra-ui/react';
import { MatchList } from './components/MatchList';
import { FilterBar } from './components/FilterBar';
import { ProfileHeader } from './components/ProfileHeader';
import { useEffect, useState, useCallback } from 'react';
import { getMatches, getPersonalStats, extractSteamId, getSteamAvatar } from './services/matchService';
import type { Match, MatchGroup, Map, SortDirection } from './types/match';
import type { PersonalStats } from './types/stats';
import { useParams } from 'react-router-dom';
import { useLayoutConfig } from './theme/breakpoints';
import { groupMatchesBySession, searchMatches, createFlatMatchGroup } from './utils/matchUtils';
import TopBar from './components/TopBar';

function App() {
  const { profileId } = useParams<{ profileId: string }>();
  const [matchGroups, setMatchGroups] = useState<MatchGroup[]>([]);
  const [maps, setMaps] = useState<Map[]>([]);
  const [openDates, setOpenDates] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<{ id: string, name: string, avatarUrl?: string, country?: string, clanlist_name?: string } | null>(null);
  const [stats, setStats] = useState<PersonalStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMap, setSelectedMap] = useState('');
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [filteredMatches, setFilteredMatches] = useState<Match[]>([]);
  const layout = useLayoutConfig();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [profileId]);

  const updateMatches = useCallback(async () => {
    if (!profileId) return;
    setIsLoading(true);
    try {
      const [data, statsData] = await Promise.all([
        getMatches(profileId),
        getPersonalStats(profileId)
      ]);
      
      // Store all matches for filtering
      setAllMatches(data.matches);
      
      // Get Steam avatar if available
      const playerInfo = statsData.statGroups?.[0]?.members?.[0];
      let avatarUrl;
      if (playerInfo?.name) {
        const steamId = extractSteamId(playerInfo.name);
        if (steamId) {
          avatarUrl = await getSteamAvatar(steamId);
        }
      }

      const name = playerInfo?.alias || data.name || profileId;
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

  // Effect to filter matches when search term, selected map, or all matches change
  useEffect(() => {
    let filtered = allMatches;
    
    // Apply map filter
    if (selectedMap) {
      filtered = filtered.filter(match => match.map === selectedMap);
    }
    
    // Apply search filter
    if (searchTerm.trim()) {
      filtered = searchMatches(filtered, searchTerm);
      // When searching, create flat groups (no date accordion)
      setMatchGroups(createFlatMatchGroup(filtered));
    } else {
      // When not searching, group by session
      setMatchGroups(groupMatchesBySession(filtered));
    }
    
    // Store filtered matches for count
    setFilteredMatches(filtered);
    
    // Update maps with counts based on filtered results
    setMaps(getMapsWithCounts(filtered));
  }, [allMatches, searchTerm, selectedMap]);

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

  const handleMapFilter = (map: string) => {
    setSelectedMap(map);
  };

  const handleSearchChange = (search: string) => {
    setSearchTerm(search);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  const handleSortChange = (direction: SortDirection) => {
    if (searchTerm.trim()) {
      // When searching, sort the matches within the single search results group
      const sortedMatches = [...filteredMatches].sort((a, b) =>
        direction === 'desc' 
          ? new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
          : new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );
      setMatchGroups(createFlatMatchGroup(sortedMatches));
    } else {
      // When not searching, sort the groups by date
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
          spacing={4} 
          mx="auto" 
          px={{ base: 2, lg: 4 }} 
          py={{ base: 4, lg: 6 }} 
          w="100%"
          maxW={{ md: '90%', xl: '1100px' }}
          bg={{ base: 'transparent', md: 'brand.parchment' }}
          borderRadius={{ md: 'xl' }}
          boxShadow={{ md: 'xl' }}
          borderWidth={{ base: '3px', md: '4px' }}
          borderColor="brand.gold"
          data-testid="floating-box-container"
        >
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
              onSortChange={handleSortChange} 
              onSearchChange={handleSearchChange}
              onClearSearch={handleClearSearch}
              maps={maps}
              searchResultsCount={searchResultsCount}
            />
            {profileId && (
              <MatchList 
                matchGroups={matchGroups} 
                openDates={openDates} 
                onOpenDatesChange={setOpenDates} 
                profileId={profileId}
              />
            )}
          </VStack>
        </VStack>
      </Box>
    </>
  );
}
export default App;

