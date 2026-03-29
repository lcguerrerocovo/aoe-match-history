import { useEffect, useRef } from 'react';
import { processRecentMatches } from '../services/matchService';
import type { Match } from '../types/match';

/**
 * Automatically triggers batch analysis for the newest match
 * if it doesn't already have APM data.
 * Fires once per profile, only when matches are loaded.
 */
export function useBatchAnalysis(profileId: string | undefined, matches: Match[]) {
  const triggeredRef = useRef<string | null>(null);

  useEffect(() => {
    if (!profileId || !matches.length) return;

    // Only trigger once per profile
    if (triggeredRef.current === profileId) return;

    const newest = matches[0];
    const hasApm = Boolean(newest?.has_apm);

    if (!hasApm) {
      triggeredRef.current = profileId;
      processRecentMatches(profileId).catch(() => {
        // Silently ignore — batch analysis is best-effort
      });
    }
  }, [profileId, matches]);
}
