import {
  Box,
  VStack,
  Text,
  Spinner,
  Alert,
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useLayoutConfig } from '../theme/breakpoints';
import TopBar from './TopBar';
import { FullMatchSummaryCard } from './FullMatchSummaryCard';
import type { Match } from '../types/match';
import { getMatch } from '../services/matchService';
import { AnalysisSection } from './Analysis';
import { CornerFlourishes } from './CornerFlourishes';
import { useTranslation } from 'react-i18next';

export function MatchPage() {
  const { t } = useTranslation();
  const { matchId } = useParams<{ matchId: string }>();
  const [match, setMatch] = useState<Match | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const layout = useLayoutConfig();

  useEffect(() => {
    const loadMatch = async () => {
      if (!matchId) {
        setError(t('match.idRequired'));
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const matchData = await getMatch(matchId);
        setMatch(matchData);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('match.loadFailed'));
      } finally {
        setIsLoading(false);
      }
    };

    loadMatch();
  }, [matchId, t]);

  if (isLoading) {
    return (
      <>
        <TopBar />
        <Box py={{ md: 8 }}>
          <VStack
            gap={4}
            mx="auto"
            px={{ base: 2, lg: 4 }}
            py={{ base: 4, lg: 6 }}
            w="100%"
            maxW={{ md: '90%', lg: '960px', xl: '1100px' }}
            bg={{ base: 'transparent', md: 'brand.parchmentSurface' }}

            borderWidth={0}
            minH="400px"
            justify="center"
          >
            <Spinner size="xl" color="brand.redChalk" />
            <Text color="brand.inkMuted">{t('match.loadingDetails')}</Text>
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
            gap={4}
            mx="auto"
            px={{ base: 2, lg: 4 }}
            py={{ base: 4, lg: 6 }}
            w="100%"
            maxW={{ md: '90%', lg: '960px', xl: '1100px' }}
            bg={{ base: 'transparent', md: 'brand.parchmentSurface' }}

            borderWidth={0}
          >
            <Alert.Root status="error">
              <Alert.Indicator />
              {error}
            </Alert.Root>
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
            gap={4}
            mx="auto"
            px={{ base: 2, lg: 4 }}
            py={{ base: 4, lg: 6 }}
            w="100%"
            maxW={{ md: '90%', lg: '960px', xl: '1100px' }}
            bg={{ base: 'transparent', md: 'brand.parchmentSurface' }}

            borderWidth={0}
          >
            <Alert.Root status="info">
              <Alert.Indicator />
              {t('match.notFound')}
            </Alert.Root>
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
          gap={4}
          mx="auto"
          px={{ base: 2, lg: 4 }}
          py={{ base: 4, lg: 6 }}
          w="100%"
          maxW={{ md: '90%', lg: '960px', xl: '1100px' }}
          bg={{ base: 'transparent', md: 'brand.parchmentSurface' }}
          borderRadius={{ md: 'sm' }}
          borderWidth={{ base: 0, md: '1px' }}
          borderColor={{ base: 'transparent', md: 'brand.inkLight' }}
          borderStyle="solid"
          position="relative"
        >
          <CornerFlourishes variant="battle" />
          <VStack
            align="stretch"
            p={layout?.mainContent.padding}
            w="100%"
            gap={6}
          >
            <FullMatchSummaryCard match={match} />

            <AnalysisSection match={match} onMatchUpdate={setMatch} />
          </VStack>
        </VStack>
      </Box>
    </>
  );
}
