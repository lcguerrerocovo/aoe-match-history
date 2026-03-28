import {
  Box,
  VStack,
  Text,
  Spinner,
  Alert,
  Card,
  Tabs,
} from '@chakra-ui/react';
import { cardVariant } from '../types/chakra-overrides';
import { useThemeMode } from '../theme/ThemeProvider';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useLayoutConfig } from '../theme/breakpoints';
import TopBar from './TopBar';
import { FullMatchSummaryCard } from './FullMatchSummaryCard';
import type { Match } from '../types/match';
import { getMatch } from '../services/matchService';
import { ApmChart } from './ApmChart';
import { ApmBreakdownChart } from './ApmBreakdownChart';
import { APMGenerator } from './APMGenerator';
import { Watermark } from './Watermark';
import { CornerFlourishes } from './CornerFlourishes';

export function MatchPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const [match, setMatch] = useState<Match | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const layout = useLayoutConfig();
  const { isDark } = useThemeMode();

  const [activePids, setActivePids] = useState<string[]>([]);

  const togglePid = (pid: string) => {
    setActivePids((prev) => {
      const allPlayerIds = match?.players?.map((p) => String(p.user_id)) || [];

      if (prev.length === allPlayerIds.length && prev.includes(pid)) {
        return [pid];
      }

      if (prev.length === 1 && prev[0] === pid) {
        return allPlayerIds;
      }

      return prev.includes(pid) ? prev.filter((p) => p !== pid) : [...prev, pid];
    });
  };

  const hasApm = Boolean(match?.apm?.players && Object.keys(match.apm.players || {}).length);

  const colorMap: Record<string, number> = {};
  if (match?.teams) {
    match.teams.forEach((team) => {
      team.forEach((p) => {
        if (p?.user_id) {
          colorMap[String(p.user_id)] = p.color_id;
        }
      });
    });
  }

  const nameMap: Record<string, string> = {};
  if (match?.players) {
    match.players.forEach((p) => {
      if (p?.user_id) {
        nameMap[String(p.user_id)] = p.name;
      }
    });
  }

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

  useEffect(() => {
    if (match?.players) {
      const ids = match.players.map((p) => String(p.user_id));
      setActivePids(ids);
    }
  }, [match]);

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
            <Text color="brand.inkMuted">Loading match details...</Text>
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
              Match not found
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

            <Card.Root variant={cardVariant('match')} w="100%" p={6} position="relative" overflow="hidden">
              <Watermark
                variant="trebuchet"
                size={240}
                style={{ right: '-50px', bottom: '-30px' }}
              />
              <Tabs.Root defaultValue="apm" colorPalette="brand">
                <Tabs.List mb={4} justifyContent="flex-start" borderBottomWidth="1px" borderBottomColor="brand.inkLight">
                  <Tabs.Trigger
                    value="apm"
                    fontWeight="semibold"
                    px={4}
                    py={2}
                    color="brand.inkMuted"
                    _hover={{ color: 'brand.redChalk' }}
                    _selected={{
                      color: isDark ? 'brand.parchment' : 'brand.inkDark',
                      fontStyle: 'italic',
                      borderBottom: '2px solid',
                      borderBottomColor: 'brand.redChalk',
                      mb: '-1px',
                    }}
                  >
                    APM
                  </Tabs.Trigger>
                  <Tabs.Trigger
                    value="actions"
                    fontWeight="semibold"
                    px={4}
                    py={2}
                    color="brand.inkMuted"
                    _hover={{ color: 'brand.redChalk' }}
                    _selected={{
                      color: isDark ? 'brand.parchment' : 'brand.inkDark',
                      fontStyle: 'italic',
                      borderBottom: '2px solid',
                      borderBottomColor: 'brand.redChalk',
                      mb: '-1px',
                    }}
                  >
                    Actions
                  </Tabs.Trigger>
                </Tabs.List>
                <Tabs.Content value="apm" p={0}>
                  {hasApm ? (
                    <>
                      <Text fontSize="lg" fontWeight="bold" color="brand.inkDark" mb={2} textAlign="center">
                        APM (Game Time)
                      </Text>
                      <ApmChart apm={match.apm!} colorByProfile={colorMap} nameByProfile={nameMap} activePids={activePids} onToggle={togglePid} />
                    </>
                  ) : (
                    <APMGenerator
                      matchId={matchId!}
                      profileId={match.players?.[0]?.user_id?.toString() || ''}
                      variant="card"
                      skipBronzeState={true}
                      onStatusChange={async (status) => {
                        if (status?.state === 'bronzeStatus') {
                          try {
                            const updatedMatch = await getMatch(matchId!);
                            setMatch(updatedMatch);
                          } catch (err) {
                            console.error('Failed to refresh match data:', err);
                          }
                        }
                      }}
                    >
                      <Text fontSize="lg" fontWeight="bold" color="brand.inkDark" mb={2} textAlign="center">
                        APM (Game Time)
                      </Text>
                      <ApmChart apm={match.apm!} colorByProfile={colorMap} nameByProfile={nameMap} activePids={activePids} onToggle={togglePid} />
                    </APMGenerator>
                  )}
                </Tabs.Content>
                <Tabs.Content value="actions" p={0}>
                  {hasApm ? (
                    <>
                      <Text fontSize="lg" fontWeight="bold" color="brand.inkDark" mb={2} textAlign="center">
                        Actions Breakdown
                      </Text>
                      <ApmBreakdownChart apm={match.apm!} colorByProfile={colorMap} nameByProfile={nameMap} />
                    </>
                  ) : (
                    <APMGenerator
                      matchId={matchId!}
                      profileId={match.players?.[0]?.user_id?.toString() || ''}
                      variant="card"
                      skipBronzeState={true}
                      onStatusChange={async (status) => {
                        if (status?.state === 'bronzeStatus') {
                          try {
                            const updatedMatch = await getMatch(matchId!);
                            setMatch(updatedMatch);
                          } catch (err) {
                            console.error('Failed to refresh match data:', err);
                          }
                        }
                      }}
                    >
                      <Text fontSize="lg" fontWeight="bold" color="brand.inkDark" mb={2} textAlign="center">
                        Actions Breakdown
                      </Text>
                      <ApmBreakdownChart apm={match.apm!} colorByProfile={colorMap} nameByProfile={nameMap} />
                    </APMGenerator>
                  )}
                </Tabs.Content>
              </Tabs.Root>
            </Card.Root>
          </VStack>
        </VStack>
      </Box>
    </>
  );
}
