import { Container, VStack, ChakraProvider } from '@chakra-ui/react'
import { MatchList } from './components/MatchList'
import { FilterBar } from './components/FilterBar'
import { useEffect, useState } from 'react'
import { getMatches } from './services/matchService'
import type { Match, MatchGroup } from './types/match'

function App() {
  const [matchGroups, setMatchGroups] = useState<MatchGroup[]>([])

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const matches = await getMatches()
        // Group matches by date
        const groups = matches.reduce((acc: { [key: string]: Match[] }, match) => {
          const date = match.start_time.split(' ')[0]
          if (!acc[date]) {
            acc[date] = []
          }
          acc[date].push(match)
          return acc
        }, {})
        // Convert to array and sort by date
        const sortedGroups = Object.entries(groups)
          .map(([date, matches]) => ({ date, matches }))
          .sort((a, b) => b.date.localeCompare(a.date))
        setMatchGroups(sortedGroups)
      } catch (error) {
        console.error('Error fetching matches:', error)
      }
    }
    fetchMatches()
  }, [])

  return (
    <ChakraProvider>
      <Container maxW="container.xl" py={8}>
        <VStack gap={8} align="stretch">
          <FilterBar />
          <MatchList matchGroups={matchGroups} />
        </VStack>
      </Container>
    </ChakraProvider>
  )
}

export default App
