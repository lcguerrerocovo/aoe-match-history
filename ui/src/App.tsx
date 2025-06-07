import { Box, Container, VStack, ChakraProvider } from '@chakra-ui/react';
import { MatchList } from './components/MatchList';
import { FilterBar } from './components/FilterBar';
import { useEffect, useState, useCallback } from 'react';
import { getMatches } from './services/matchService';
import type { Match, MatchGroup, Map, SortDirection } from './types/match';

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
  const [matchGroups, setMatchGroups] = useState<MatchGroup[]>([]);
  const [maps, setMaps] = useState<Map[]>([]);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const updateMatches = useCallback(async (filterFn?: (matches: Match[]) => Match[]) => {
    const matches = await getMatches();
    const filtered = filterFn ? filterFn(matches) : matches;
    setMaps(getMapsWithCounts(filtered));
    setMatchGroups(groupMatchesByDate(filtered));
  }, []);

  useEffect(() => {
    updateMatches();
  }, []);

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
    setSortDirection(direction);
    setMatchGroups(
      matchGroups.sort((a, b) =>
        sortDirection === 'desc' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)
      )
    );
  };

  return (
    <ChakraProvider>
      <Box maxWidth="100vw" overflowX="hidden">
        <Container maxW="container.xl" py={8} mx="auto">
          <VStack gap={8} align="stretch">
            <FilterBar onMapChange={handleMapFilter} onSortChange={handleSortChange} maps={maps} />
            <MatchList matchGroups={matchGroups} />
          </VStack>
        </Container>
      </Box>
    </ChakraProvider>
  );
}
export default App;

