/**
 * Tracks which match IDs are currently being processed to avoid duplicate work.
 * Entries expire after TTL_MS so crashed processing attempts don't block retries.
 */
const TTL_MS = 5 * 60_000; // 5 minutes — covers aoe.ms rate limiting + backoff

const inFlight = new Map<string, number>();

function isInFlight(matchId: string): boolean {
  const timestamp = inFlight.get(matchId);
  if (timestamp === undefined) return false;
  if (Date.now() - timestamp > TTL_MS) {
    inFlight.delete(matchId);
    return false;
  }
  return true;
}

function markInFlight(matchId: string): void {
  inFlight.set(matchId, Date.now());
}

function markDone(matchId: string): void {
  inFlight.delete(matchId);
}

function clear(): void {
  inFlight.clear();
}

export const analysisTracker = { isInFlight, markInFlight, markDone, clear };
