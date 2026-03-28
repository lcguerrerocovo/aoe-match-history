import { useState, useEffect, useMemo } from 'react';
import { Card, VStack } from '@chakra-ui/react';
import { cardVariant } from '../../types/chakra-overrides';
import { Watermark } from '../Watermark';
import { ApmChart } from '../ApmChart';
import { ApmBreakdownChart } from '../ApmBreakdownChart';
import { APMGenerator, type APMStatus } from '../APMGenerator';
import { AnalysisHeader } from './AnalysisHeader';
import type { AnalysisView } from './ChartNav';
import type { Match } from '../../types/match';
import { getMatch } from '../../services/matchService';

interface AnalysisSectionProps {
  match: Match;
  onMatchUpdate?: (match: Match) => void;
}

export function AnalysisSection({ match, onMatchUpdate }: AnalysisSectionProps) {
  const [activeView, setActiveView] = useState<AnalysisView>('apm');

  const hasApm = Boolean(match?.apm?.players && Object.keys(match.apm.players || {}).length);

  const colorMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (match?.teams) {
      match.teams.forEach((team) => {
        team.forEach((p) => {
          if (p?.user_id) {
            map[String(p.user_id)] = p.color_id;
          }
        });
      });
    }
    return map;
  }, [match?.teams]);

  const nameMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (match?.players) {
      match.players.forEach((p) => {
        if (p?.user_id) {
          map[String(p.user_id)] = p.name;
        }
      });
    }
    return map;
  }, [match?.players]);

  // Player visibility state for APM chart (multi-toggle)
  const [activePids, setActivePids] = useState<string[]>([]);

  useEffect(() => {
    if (match?.players) {
      setActivePids(match.players.map((p) => String(p.user_id)));
    }
  }, [match?.players]);

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

  const matchId = match.match_id;
  const profileId = match.players?.[0]?.user_id?.toString() || '';

  const handleStatusChange = async (status: APMStatus | null) => {
    if (status?.state === 'bronzeStatus') {
      try {
        const updatedMatch = await getMatch(matchId);
        onMatchUpdate?.(updatedMatch);
      } catch (err) {
        console.error('Failed to refresh match data:', err);
      }
    }
  };

  const renderApmView = () => {
    if (hasApm) {
      return (
        <ApmChart
          apm={match.apm!}
          colorByProfile={colorMap}
          nameByProfile={nameMap}
          activePids={activePids}
          onToggle={togglePid}
        />
      );
    }
    return (
      <APMGenerator
        matchId={matchId}
        profileId={profileId}
        variant="card"
        skipBronzeState={true}
        onStatusChange={handleStatusChange}
      >
        <ApmChart
          apm={match.apm!}
          colorByProfile={colorMap}
          nameByProfile={nameMap}
          activePids={activePids}
          onToggle={togglePid}
        />
      </APMGenerator>
    );
  };

  const renderActionsView = () => {
    if (hasApm) {
      return (
        <ApmBreakdownChart
          apm={match.apm!}
          colorByProfile={colorMap}
          nameByProfile={nameMap}
        />
      );
    }
    return (
      <APMGenerator
        matchId={matchId}
        profileId={profileId}
        variant="card"
        skipBronzeState={true}
        onStatusChange={handleStatusChange}
      >
        <ApmBreakdownChart
          apm={match.apm!}
          colorByProfile={colorMap}
          nameByProfile={nameMap}
        />
      </APMGenerator>
    );
  };

  return (
    <Card.Root variant={cardVariant('match')} w="100%" p={{ base: 4, md: 6 }} position="relative" overflow="hidden">
      <Watermark
        variant="trebuchet"
        size={240}
        style={{ right: '-50px', bottom: '-30px' }}
      />
      <VStack gap={3} align="stretch">
        <AnalysisHeader
          activeView={activeView}
          onChangeView={setActiveView}
          disabled={!hasApm}
        />
        {activeView === 'apm' ? renderApmView() : renderActionsView()}
      </VStack>
    </Card.Root>
  );
}
