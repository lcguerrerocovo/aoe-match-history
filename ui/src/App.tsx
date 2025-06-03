import { Container, VStack, ChakraProvider } from '@chakra-ui/react';
import { MatchList } from './components/MatchList';
import { FilterBar } from './components/FilterBar';
import { useEffect, useState } from 'react';
import { getMatches } from './services/matchService';
import type { Match, MatchGroup, Map, SortDirection } from './types/match';

function App() {
  const [matchGroups, setMatchGroups] = useState<MatchGroup[]>([]);
  const [maps, setMaps] = useState<Map[]>([]);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const updateMatches = async (filter?: (matches: Match[]) => Match[]) => {
    const matches = await getMatches();
    const filtered = filter ? filter(matches) : matches;
    setMaps(getMapsWithCounts(filtered));
    setMatchGroups(groupMatchesByDate(filtered));
  };

  useEffect(() => {
    updateMatches();
  }, []);

  const groupMatchesByDate = (matches: Match[]): MatchGroup[] => {
    const groups = matches.reduce((acc: { [key: string]: Match[] }, match) => {
      const date = match.start_time.split(' ')[0];
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(match);
      return acc;
    }, {});
    // Convert to array and sort by date
    return Object.entries(groups).map(([date, matches]) => ({ date, matches }));
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
    setSortDirection(direction);
    setMatchGroups(
      matchGroups.sort((a, b) =>
        sortDirection === 'desc' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)
      )
    );
  };

  return (
    <ChakraProvider>
      <Container maxW="container.xl" py={8}>
        <VStack gap={8} align="stretch">
          <FilterBar onMapChange={handleMapFilter} onSortChange={handleSortChange} maps={maps} />
          <MatchList matchGroups={matchGroups} />
        </VStack>
      </Container>
    </ChakraProvider>
  );
}

export default App;
