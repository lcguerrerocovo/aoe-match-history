import { useState, useEffect, useRef } from 'react';
import { getMatchAnalysis } from '../../services/matchService';
import type { ApmData } from '../../types/match';

type AutoAnalysisStatus = 'loading' | 'complete' | 'processing' | 'unavailable';

interface UseAutoAnalysisOptions {
  onAnalysisReady?: (apm: ApmData) => void;
}

export function useAutoAnalysis(
  matchId: string,
  hasExistingApm: boolean,
  options?: UseAutoAnalysisOptions,
) {
  const [status, setStatus] = useState<AutoAnalysisStatus>(hasExistingApm ? 'complete' : 'loading');
  const pollCount = useRef(0);
  const onReadyRef = useRef(options?.onAnalysisReady);
  onReadyRef.current = options?.onAnalysisReady;

  useEffect(() => {
    if (hasExistingApm) {
      setStatus('complete');
      return;
    }

    let cancelled = false;
    pollCount.current = 0;

    const fetchAnalysis = async () => {
      const result = await getMatchAnalysis(matchId);
      if (cancelled) return;

      if (result.status === 'complete' && result.apm) {
        setStatus('complete');
        onReadyRef.current?.(result.apm);
        return;
      }

      if (result.status === 'unavailable') {
        setStatus('unavailable');
        return;
      }

      // Still processing — poll
      setStatus('processing');
      pollCount.current++;

      if (pollCount.current >= 3) return; // Stop after 3 polls

      const delay = pollCount.current === 1 ? 10_000 : 15_000;
      setTimeout(() => {
        if (!cancelled) fetchAnalysis();
      }, delay);
    };

    fetchAnalysis();

    return () => { cancelled = true; };
  }, [matchId, hasExistingApm]);

  return { status };
}
