export interface LatestRatingPlayer {
  profileId: number;
  newRating: number | null;
}

export interface LatestRatingMatch {
  matchId: number;
  matchTypeId: number | null;
  startTime: Date | null;
  completionTime: Date | null;
  players: LatestRatingPlayer[];
}

export interface LatestRatingRow {
  profileId: number;
  matchTypeId: number;
  rating: number;
  sourceMatchId: number;
  sourceTime: Date;
}

export function buildLatestRatingRows(matches: readonly LatestRatingMatch[]): LatestRatingRow[] {
  const rows: LatestRatingRow[] = [];

  for (const match of matches) {
    if (match.matchTypeId == null) continue;

    const sourceTime = match.completionTime ?? match.startTime ?? new Date(0);
    for (const player of match.players) {
      if (player.newRating == null || player.newRating <= 0) continue;

      rows.push({
        profileId: player.profileId,
        matchTypeId: match.matchTypeId,
        rating: player.newRating,
        sourceMatchId: match.matchId,
        sourceTime,
      });
    }
  }

  return rows;
}
