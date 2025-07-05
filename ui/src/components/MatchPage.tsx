import { Box, VStack, Text, Spinner, Alert, AlertIcon } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useLayoutConfig } from '../theme/breakpoints';
import TopBar from './TopBar';
import { EnlargedMatchCard } from './EnlargedMatchCard';
import type { Match } from '../types/match';
import { getMatch } from '../services/matchService';

export function MatchPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const [match, setMatch] = useState<Match | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const layout = useLayoutConfig();

  useEffect(() => {
    const loadMatch = async () => {
      if (!matchId) {
        setError('Match ID is required');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const matchData = await getMatch(matchId);
        setMatch(matchData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load match');
      } finally {
        setIsLoading(false);
      }
    };

    loadMatch();
  }, [matchId]);

  if (isLoading) {
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
            bg={{ base: 'transparent', md: 'brand.parchmentSurface' }}
            borderRadius={{ md: 'xl' }}
            boxShadow={{ md: 'xl' }}
            borderWidth={{ base: '3px', md: '4px' }}
            borderColor="brand.gold"
            minH="400px"
            justify="center"
          >
            <Spinner size="xl" color="brand.gold" />
            <Text color="brand.steel">Loading match details...</Text>
          </VStack>
        </Box>
      </>
    );
  }

  if (error) {
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
            bg={{ base: 'transparent', md: 'brand.parchmentSurface' }}
            borderRadius={{ md: 'xl' }}
            boxShadow={{ md: 'xl' }}
            borderWidth={{ base: '3px', md: '4px' }}
            borderColor="brand.gold"
          >
            <Alert status="error">
              <AlertIcon />
              {error}
            </Alert>
          </VStack>
        </Box>
      </>
    );
  }

  if (!match) {
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
            bg={{ base: 'transparent', md: 'brand.parchmentSurface' }}
            borderRadius={{ md: 'xl' }}
            boxShadow={{ md: 'xl' }}
            borderWidth={{ base: '3px', md: '4px' }}
            borderColor="brand.gold"
          >
            <Alert status="info">
              <AlertIcon />
              Match not found
            </Alert>
          </VStack>
        </Box>
      </>
    );
  }

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
          bg={{ base: 'transparent', md: 'brand.parchmentSurface' }}
          borderRadius={{ md: 'xl' }}
          boxShadow={{ md: 'xl' }}
          borderWidth={{ base: '3px', md: '4px' }}
          borderColor="brand.gold"
        >
          <VStack 
            align="stretch"
            p={layout?.mainContent.padding}
            w="100%"
            spacing={6}
          >
            {/* Enlarged Match Card */}
            <EnlargedMatchCard match={match} />
            
            {/* Future content will go here */}
            <Box>
              <Text color="brand.steel" fontStyle="italic" textAlign="center">
                Additional match details coming soon...
              </Text>
            </Box>
          </VStack>
        </VStack>
      </Box>
    </>
  );
} 