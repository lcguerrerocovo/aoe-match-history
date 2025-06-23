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
import { groupMatchesBySession } from './utils/matchUtils';
import TopBar from './components/TopBar';

function App() {
  const { profileId } = useParams<{ profileId: string }>();
  const [matchGroups, setMatchGroups] = useState<MatchGroup[]>([]);
  const [maps, setMaps] = useState<Map[]>([]);
  const [openDates, setOpenDates] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<{ id: string, name: string, avatarUrl?: string, country?: string, clanlist_name?: string } | null>(null);
  const [stats, setStats] = useState<PersonalStats | null>(null);
  const layout = useLayoutConfig();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [profileId]);

  const updateMatches = useCallback(async (filterFn?: (matches: Match[]) => Match[]) => {
    if (!profileId) return;
    setIsLoading(true);
    try {
      const [data, statsData] = await Promise.all([
        getMatches(profileId),
        getPersonalStats(profileId)
      ]);
      const filtered = filterFn ? filterFn(data.matches) : data.matches;
      setMaps(getMapsWithCounts(filtered));
      setMatchGroups(groupMatchesBySession(filtered));
      
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
    updateMatches(map ? (matches) => matches.filter((m) => m.map === map) : undefined);
  };

  const handleSortChange = (direction: SortDirection) => {
    setMatchGroups([...matchGroups].sort((a, b) =>
      direction === 'desc' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)
    ));
  };

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
            <FilterBar onMapChange={handleMapFilter} onSortChange={handleSortChange} maps={maps} />
            {profileId && <MatchList matchGroups={matchGroups} openDates={openDates} onOpenDatesChange={setOpenDates} profileId={profileId} />}
          </VStack>
        </VStack>
      </Box>
    </>
  );
}
export default App;

