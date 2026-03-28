import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, VStack } from '@chakra-ui/react';
import { cardVariant } from '../../types/chakra-overrides';
import { Watermark } from '../Watermark';
import { ApmChart } from '../ApmChart';
import { ApmBreakdownChart, ActionTypeLegend } from '../ApmBreakdownChart';
import { extractActionTypes, calculateActionTypeTotals } from '../ApmBreakdownChart/utils';
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

  // Action type legend — computed eagerly so layout is stable on both views
  const selectedPlayerData = useMemo(() => {
    if (!actionsSelectedPid || !match?.apm?.players?.[actionsSelectedPid]) return null;
    const data = match.apm.players[actionsSelectedPid];
    return Array.isArray(data) ? data : null;
  }, [match?.apm, actionsSelectedPid]);

  const allActionTypes = useMemo(() => {
    if (!selectedPlayerData) return [];
    return extractActionTypes(selectedPlayerData);
  }, [selectedPlayerData]);

  const [activeActionTypes, setActiveActionTypes] = useState<Set<string>>(new Set());

  useEffect(() => {
    setActiveActionTypes(new Set(allActionTypes));
  }, [allActionTypes]);

  const toggleActionType = useCallback((actionType: string) => {
    setActiveActionTypes((prev) => {
      const next = new Set(prev);
      if (next.has(actionType)) next.delete(actionType);
      else next.add(actionType);
      return next;
    });
  }, []);

  const actionTypeColorMap = useMemo(() => {
    if (!selectedPlayerData) return {};
    const totals = calculateActionTypeTotals(selectedPlayerData, allActionTypes);
    const sorted = Object.entries(totals).sort(([, a], [, b]) => b - a).map(([t]) => t);
    const map: Record<string, number> = {};
    sorted.forEach((t, i) => { map[t] = i; });
    return map;
  }, [selectedPlayerData, allActionTypes]);

  const allActionTypesWithStats = useMemo(() => {
    if (!selectedPlayerData) return [];
    const totals = calculateActionTypeTotals(selectedPlayerData, allActionTypes);
    const all = Object.entries(totals).map(([actionType, total]) => ({ actionType, total }));
    const activeTotals = all.filter((s) => activeActionTypes.has(s.actionType));
    const totalActive = activeTotals.reduce((sum, s) => sum + s.total, 0);
    return all
      .map((s) => ({
        ...s,
        percentage: activeActionTypes.has(s.actionType) && totalActive > 0
          ? Math.round((s.total / totalActive) * 100)
          : null,
      }))
      .sort((a, b) => b.total - a.total);
  }, [selectedPlayerData, allActionTypes, activeActionTypes]);

  const renderChartContent = () => {
    if (!hasApm) {
      return (
        <AnalysisEmptyState
          status={status}
          isLoading={isLoading}
          isProcessing={isProcessing}
          error={error}
          onGenerate={generate}
        />
      );
    }

    if (activeView === 'apm') {
      return (
        <ApmChart
          apm={match.apm!}
          colorByProfile={colorMap}
          nameByProfile={nameMap}
          activePids={activePids}
        />
      );
    }

    return (
      <ApmBreakdownChart
        apm={match.apm!}
        selectedPlayerId={actionsSelectedPid}
        activeActionTypes={activeActionTypes}
        actionTypeColorMap={actionTypeColorMap}
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
        <ChartViewport dataPointCount={dataPointCount}>
          {renderChartContent()}
        </ChartViewport>
        {hasApm && allActionTypesWithStats.length > 0 && (
          <ActionTypeLegend
            allActionTypesWithStats={allActionTypesWithStats}
            activeActionTypes={activeActionTypes}
            actionTypeColorMap={actionTypeColorMap}
            onToggleActionType={toggleActionType}
            hidden={activeView !== 'actions'}
          />
        )}
      </VStack>
    </Card.Root>
  );
}
