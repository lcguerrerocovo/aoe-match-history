import { Box, Container, VStack } from '@chakra-ui/react';
import { MatchList } from './components/MatchList';
import { FilterBar } from './components/FilterBar';
import { ProfileHeader } from './components/ProfileHeader';
import { useEffect, useState, useCallback } from 'react';
import { getMatches, clearMatchesCache } from './services/matchService';
import type { Match, MatchGroup, Map, SortDirection } from './types/match';
import { useParams } from 'react-router-dom';
import { useLayoutConfig } from './theme/breakpoints';

function toISODateString(dateStr: string): string {
  // Handles 'YYYY-MM-DD HH:mm UTC' and similar
  if (dateStr.includes('UTC')) {
    // If missing seconds, add ':00'
    let iso = dateStr.replace(' ', 'T').replace(' UTC', 'Z');
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}Z$/.test(iso)) {
      iso = iso.replace('Z', ':00Z');
    }
    return iso;
  }
  return dateStr;
}

function App() {
  const { profileId } = useParams<{ profileId: string }>();
  const [matchGroups, setMatchGroups] = useState<MatchGroup[]>([]);
  const [maps, setMaps] = useState<Map[]>([]);
  const [openDates, setOpenDates] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<{ id: string, name: string } | null>(null);
  const layout = useLayoutConfig();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [profileId]);

  const updateMatches = useCallback(async (filterFn?: (matches: Match[]) => Match[]) => {
    setIsLoading(true);
    try {
      const data = await getMatches(profileId);
      const filtered = filterFn ? filterFn(data.matches) : data.matches;
      setMaps(getMapsWithCounts(filtered));
      setMatchGroups(groupMatchesByDate(filtered));
      setProfile({ id: data.id, name: data.name });
      setOpenDates([]); // Reset accordion state when profile changes
    } finally {
      setIsLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    clearMatchesCache(profileId);
    updateMatches();
  }, [profileId, updateMatches]);

  const groupMatchesByDate = (matches: Match[]): MatchGroup[] => {
    const groups = matches.reduce((acc: { [key: string]: Match[] }, match) => {
      const date = new Date(toISODateString(match.start_time)).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(match);
      return acc;
    }, {});
    // Convert to array and sort by date
    return Object.entries(groups)
      .map(([date, matches]) => ({ date, matches }))
      .sort((a, b) => b.date.localeCompare(a.date)); // Sort descending by date
  };

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
    <Box maxWidth={layout?.container.maxWidth} overflowX="hidden">
      {profileId && <ProfileHeader profileId={profileId} profile={profile} isLoading={isLoading} />}
      <Container 
        maxW={layout?.container.maxWidth} 
        py={layout?.container.padding} 
        mx="auto" 
        ml={layout?.container.marginLeft}
      >
        <VStack 
          gap={layout?.grid.gap} 
          align="stretch"
          p={layout?.grid.padding}
        >
          <FilterBar onMapChange={handleMapFilter} onSortChange={handleSortChange} maps={maps} />
          <MatchList matchGroups={matchGroups} openDates={openDates} onOpenDatesChange={setOpenDates} />
        </VStack>
      </Container>
    </Box>
  );
}
export default App;

