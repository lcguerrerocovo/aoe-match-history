/**
 * Tracks which match IDs are currently being processed to avoid duplicate work.
 */
class AnalysisTracker {
  private inFlight = new Set<string>();

  isInFlight(matchId: string): boolean {
    return this.inFlight.has(matchId);
  }

  markInFlight(matchId: string): void {
    this.inFlight.add(matchId);
  }

  markDone(matchId: string): void {
    this.inFlight.delete(matchId);
  }
}

export const analysisTracker = new AnalysisTracker();
