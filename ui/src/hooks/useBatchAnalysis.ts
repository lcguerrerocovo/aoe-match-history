import { useState, useEffect, useRef, useCallback } from 'react';
import {
  triggerBatchAnalysis,
  getAnalysisStatus,
} from '../services/matchService';

interface UseBatchAnalysisOptions {
  profileId: string;
  matchIds: string[];
}

export function useBatchAnalysis({
  profileId,
  matchIds,
}: UseBatchAnalysisOptions) {
  const [analyzedIds, setAnalyzedIds] = useState<Set<string>>(new Set());
  const [newlyAnalyzed, setNewlyAnalyzed] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const pollCount = useRef(0);
  const pollTimer = useRef<ReturnType<typeof setInterval>>();
  const prevAnalyzed = useRef<Set<string>>(new Set());

  // Initial status check + batch trigger
  useEffect(() => {
    if (!profileId || !matchIds.length) return;

    let cancelled = false;

    (async () => {
      // Get current analysis status
      const status = await getAnalysisStatus(matchIds);
      if (cancelled) return;
      setAnalyzedIds(status);
      prevAnalyzed.current = status;

      // Trigger batch processing (fire-and-forget)
      triggerBatchAnalysis(profileId);

      // If not all matches are analyzed, poll for updates
      // (batch may still be running from a previous trigger even if debounced)
      const allAlreadyDone = matchIds.every(id => status.has(id));
      if (cancelled || allAlreadyDone) return;

      setIsProcessing(true);
      pollCount.current = 0;

      pollTimer.current = setInterval(async () => {
        pollCount.current++;
        if (pollCount.current > 8) {
          clearInterval(pollTimer.current);
          setIsProcessing(false);
          return;
        }

        const updated = await getAnalysisStatus(matchIds);
        if (cancelled) return;

        // Diff: find newly analyzed
        const newIds = new Set<string>();
        for (const id of updated) {
          if (!prevAnalyzed.current.has(id)) {
            newIds.add(id);
          }
        }

        if (newIds.size > 0) {
          setNewlyAnalyzed((prev) => {
            const merged = new Set(prev);
            for (const id of newIds) merged.add(id);
            return merged;
          });
        }

        setAnalyzedIds(updated);
        prevAnalyzed.current = updated;

        // Stop if all visible matches are analyzed
        const allDone = matchIds.every((id) => updated.has(id));
        if (allDone) {
          clearInterval(pollTimer.current);
          setIsProcessing(false);
        }
      }, 15_000);
    })();

    return () => {
      cancelled = true;
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId, matchIds.join(',')]);

  // Clear "newly analyzed" animation state after transition completes
  const clearNewlyAnalyzed = useCallback((matchId: string) => {
    setNewlyAnalyzed((prev) => {
      const next = new Set(prev);
      next.delete(matchId);
      return next;
    });
  }, []);

  return {
    analyzedIds,
    newlyAnalyzed,
    isProcessing,
    clearNewlyAnalyzed,
  };
}
