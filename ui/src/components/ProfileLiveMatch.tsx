import { Box } from '@chakra-ui/react';
import { useEffect, useState, useRef, useMemo } from 'react';
import { LiveMatchCard } from './LiveMatchCard';
import { getMatchAvgRating } from './live';
import { getLiveMatchForPlayer } from '../services/liveMatchService';
import { getLeaderboardRatingForMatchType } from '../utils/liveMatchUtils';
import type { LiveMatch } from '../types/liveMatch';
import type { Match } from '../types/match';
import type { LeaderboardStats } from '../types/stats';

const REFRESH_INTERVAL_MS = 30_000;

interface ProfileLiveMatchProps {
  profileId: number;
  matches?: Match[];
  leaderboardStats?: LeaderboardStats[];
}

export function ProfileLiveMatch({ profileId, matches = [], leaderboardStats }: ProfileLiveMatchProps) {
  const [match, setMatch] = useState<LiveMatch | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetch = async () => {
      const result = await getLiveMatchForPlayer(profileId);
      if (!cancelled) setMatch(result);
    };

    fetch();
    intervalRef.current = setInterval(fetch, REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [profileId]);

  // Override the viewed player's rating with a fresher source than the
  // DB-backed enrichment (which lags behind the collector schedule):
  // personal stats for the match's ladder, else their latest completed
  // match of the same game type from history.
  const enrichedMatch = useMemo(() => {
    if (!match) return match;

    let freshRating = getLeaderboardRatingForMatchType(leaderboardStats, match.matchtype_id);

    if (freshRating == null && matches.length) {
      const latestMatch = matches.find(m =>
        m.diplomacy?.type === match.game_type &&
        m.players?.some(p => String(p.user_id) === String(profileId))
      );
      const latestPlayer = latestMatch?.players.find(p => String(p.user_id) === String(profileId));
      freshRating = latestPlayer?.rating ?? null;
    }

    if (freshRating == null) return match;

    return {
      ...match,
      players: match.players.map(p =>
        p.profile_id === profileId ? { ...p, rating: freshRating } : p
      ),
    };
  }, [match, matches, profileId, leaderboardStats]);

  if (!enrichedMatch) return null;

  return (
    <Box
      borderWidth="1px"
      borderColor="brand.borderWarm"
      borderRadius="md"
      overflow="hidden"
      bg="brand.cardBg"
      css={{ '& > div': { border: 'none', marginBottom: 0, borderRadius: 0 } }}
    >
      <LiveMatchCard match={enrichedMatch} highlightProfileId={profileId} avgRating={getMatchAvgRating(enrichedMatch)} />
    </Box>
  );
}
