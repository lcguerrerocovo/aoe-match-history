import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, VStack } from '@chakra-ui/react';
import { cardVariant } from '../../types/chakra-overrides';
import { Watermark } from '../Watermark';
import { ApmChart } from '../ApmChart';
import { ApmBreakdownChart } from '../ApmBreakdownChart';
import { AnalysisHeader } from './AnalysisHeader';
import { PlayerBar } from './PlayerBar';
import { ChartViewport } from './ChartViewport';
import { AnalysisEmptyState } from './AnalysisEmptyState';
import { useApmGeneration } from './useApmGeneration';
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

  // Actions view: single-select player
  const [actionsSelectedPid, setActionsSelectedPid] = useState<string>('');

  useEffect(() => {
    if (match?.apm?.players) {
      const pids = Object.keys(match.apm.players);
      if (pids.length && !pids.includes(actionsSelectedPid)) {
        const best = pids.reduce((b, pid) => {
          return (match.apm!.players[pid]?.length ?? 0) > (match.apm!.players[b]?.length ?? 0) ? pid : b;
        }, pids[0]);
        setActionsSelectedPid(best);
      }
    }
  }, [match?.apm?.players]);

  // Average APM per player (simple total, not filtered by action types)
  const averages = useMemo(() => {
    const avg: Record<string, number> = {};
    Object.entries(match?.apm?.players ?? {}).forEach(([pid, series]) => {
      if (!Array.isArray(series) || !series.length) return;
      const sum = (series as Array<Record<string, number>>).reduce((acc, pt) => {
        const val = typeof pt.total === 'number'
          ? pt.total
          : Object.entries(pt).reduce((a, [k, v]) => (k !== 'minute' && k !== 'total' && typeof v === 'number' ? a + v : a), 0);
        return acc + val;
      }, 0);
      avg[pid] = Math.round(sum / series.length);
    });
    return avg;
  }, [match?.apm]);

  // Player data for PlayerBar (pre-sorted by avgApm desc)
  const playerBarData = useMemo(() => {
    const pids = Object.keys(match?.apm?.players ?? {});
    return pids
      .map((pid) => ({
        pid,
        name: nameMap[pid] ?? pid,
        colorId: colorMap[pid] ?? 1,
        avgApm: averages[pid] ?? 0,
      }))
      .sort((a, b) => b.avgApm - a.avgApm);
  }, [match?.apm, nameMap, colorMap, averages]);

  // Max data points across all players (for ChartViewport width)
  const dataPointCount = useMemo(() => {
    if (!match?.apm?.players) return 0;
    let maxMinute = 0;
    Object.values(match.apm.players).forEach((series: any[]) => {
      const last = series[series.length - 1];
      if (last && last.minute > maxMinute) maxMinute = last.minute;
    });
    return maxMinute + 1;
  }, [match?.apm]);

  const matchId = match.match_id;
  const profileId = match.players?.[0]?.user_id?.toString() || '';

  const handleBronzeStatus = useCallback(async () => {
    try {
      const updatedMatch = await getMatch(matchId);
      onMatchUpdate?.(updatedMatch);
    } catch (err) {
      console.error('Failed to refresh match data:', err);
    }
  }, [matchId, onMatchUpdate]);

  const { status, isLoading, isProcessing, error, generate, containerRef } =
    useApmGeneration(matchId, profileId, { onBronzeStatus: handleBronzeStatus });

  const renderChart = () => {
    if (!hasApm) {
      return (
        <ChartViewport dataPointCount={0}>
          <AnalysisEmptyState
            status={status}
            isLoading={isLoading}
            isProcessing={isProcessing}
            error={error}
            onGenerate={generate}
          />
        </ChartViewport>
      );
    }

    if (activeView === 'apm') {
      return (
        <ChartViewport dataPointCount={dataPointCount}>
          <ApmChart
            apm={match.apm!}
            colorByProfile={colorMap}
            nameByProfile={nameMap}
            activePids={activePids}
          />
        </ChartViewport>
      );
    }

    return (
      <ApmBreakdownChart
        apm={match.apm!}
        selectedPlayerId={actionsSelectedPid}
        colorByProfile={colorMap}
        nameByProfile={nameMap}
      />
    );
  };

  return (
    <Card.Root ref={containerRef} variant={cardVariant('match')} w="100%" p={{ base: 4, md: 6 }} position="relative" overflow="hidden">
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
        {hasApm && (
          <PlayerBar
            players={playerBarData}
            activePids={activeView === 'apm' ? activePids : [actionsSelectedPid]}
            onToggle={activeView === 'apm' ? togglePid : (pid: string) => setActionsSelectedPid(pid)}
          />
        )}
        {renderChart()}
      </VStack>
    </Card.Root>
  );
}
