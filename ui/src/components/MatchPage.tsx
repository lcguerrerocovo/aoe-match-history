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

export function MatchPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const [match, setMatch] = useState<Match | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const layout = useLayoutConfig();
  const { isDark } = useThemeMode();
  const tabText = isDark ? 'brand.parchment' : 'brand.midnightBlue';
  const tabSelectedText = isDark ? 'brand.brightGold' : 'brand.midnightBlue';
  const tabSelectedBg = isDark ? 'brand.steel' : 'brand.stoneLight';
  const tabBorder = isDark ? 'brand.steel' : 'brand.slateBorder';

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
            maxW={{ md: '90%', xl: '1100px' }}
            bg={{ base: 'transparent', md: 'brand.parchmentSurface' }}
            borderRadius={{ md: 'xl' }}
            boxShadow={{ md: 'xl' }}
            borderWidth={{ base: '3px', md: '4px' }}
            borderTopWidth={{ base: 0, md: '4px' }}
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
            gap={4}
            mx="auto"
            px={{ base: 2, lg: 4 }}
            py={{ base: 4, lg: 6 }}
            w="100%"
            maxW={{ md: '90%', xl: '1100px' }}
            bg={{ base: 'transparent', md: 'brand.parchmentSurface' }}
            borderRadius={{ md: 'xl' }}
            boxShadow={{ md: 'xl' }}
            borderWidth={{ base: '3px', md: '4px' }}
            borderTopWidth={{ base: 0, md: '4px' }}
            borderColor="brand.gold"
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
            maxW={{ md: '90%', xl: '1100px' }}
            bg={{ base: 'transparent', md: 'brand.parchmentSurface' }}
            borderRadius={{ md: 'xl' }}
            boxShadow={{ md: 'xl' }}
            borderWidth={{ base: '3px', md: '4px' }}
            borderTopWidth={{ base: 0, md: '4px' }}
            borderColor="brand.gold"
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
          maxW={{ md: '90%', xl: '1100px' }}
          bg={{ base: 'transparent', md: 'brand.parchmentSurface' }}
          borderRadius={{ md: 'xl' }}
          boxShadow={{ md: 'xl' }}
          borderWidth={{ base: 0, md: '4px' }}
          borderColor={{ base: 'transparent', md: 'brand.gold' }}
        >
          <VStack
            align="stretch"
            p={layout?.mainContent.padding}
            w="100%"
            gap={6}
          >
            <FullMatchSummaryCard match={match} />

            <Card.Root variant={cardVariant('match')} w="100%" p={6} bg="brand.sessionCardBg" borderColor="brand.slateBorder" borderWidth="1px">
              <Tabs.Root defaultValue="apm" colorPalette="brand">
                <Tabs.List mb={4} justifyContent="flex-start">
                  <Tabs.Trigger
                    value="apm"
                    fontWeight="bold"
                    w={{ base: '100px', md: '120px' }}
                    color={tabText}
                    _selected={{
                      color: tabSelectedText,
                      bg: tabSelectedBg,
                      border: '1px solid',
                      borderColor: tabBorder,
                      borderBottomColor: tabBorder,
                    }}
                  >
                    APM
                  </Tabs.Trigger>
                  <Tabs.Trigger
                    value="actions"
                    fontWeight="bold"
                    w={{ base: '100px', md: '120px' }}
                    color={tabText}
                    _selected={{
                      color: tabSelectedText,
                      bg: tabSelectedBg,
                      border: '1px solid',
                      borderColor: tabBorder,
                      borderBottomColor: tabBorder,
                    }}
                  >
                    Actions
                  </Tabs.Trigger>
                </Tabs.List>
                <Tabs.Content value="apm" p={0}>
                  {hasApm ? (
                    <>
                      <Text fontSize="lg" fontWeight="bold" color="brand.midnightBlue" mb={2} textAlign="center">
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
                      <Text fontSize="lg" fontWeight="bold" color="brand.midnightBlue" mb={2} textAlign="center">
                        APM (Game Time)
                      </Text>
                      <ApmChart apm={match.apm!} colorByProfile={colorMap} nameByProfile={nameMap} activePids={activePids} onToggle={togglePid} />
                    </APMGenerator>
                  )}
                </Tabs.Content>
                <Tabs.Content value="actions" p={0}>
                  {hasApm ? (
                    <>
                      <Text fontSize="lg" fontWeight="bold" color="brand.midnightBlue" mb={2} textAlign="center">
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
                      <Text fontSize="lg" fontWeight="bold" color="brand.midnightBlue" mb={2} textAlign="center">
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
