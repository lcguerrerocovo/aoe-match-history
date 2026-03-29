import { Box } from '@chakra-ui/react';
import { useEffect, useState, useRef, useMemo } from 'react';
import { LiveMatchCard } from './LiveMatchCard';
import { getMatchAvgRating } from './live';
import { getLiveMatchForPlayer } from '../services/liveMatchService';
import type { LiveMatch } from '../types/liveMatch';
import type { Match } from '../types/match';

const REFRESH_INTERVAL_MS = 30_000;

interface ProfileLiveMatchProps {
  profileId: number;
  matches?: Match[];
}

export function ProfileLiveMatch({ profileId, matches = [] }: ProfileLiveMatchProps) {
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

  // Override the viewed player's rating with the latest from match history
  const enrichedMatch = useMemo(() => {
    if (!match || !matches.length) return match;

    // Find the latest completed match of the same game type for this player
    const latestMatch = matches.find(m =>
      m.diplomacy?.type === match.game_type &&
      m.players?.some(p => String(p.user_id) === String(profileId))
    );

    if (!latestMatch) return match;

    const latestPlayer = latestMatch.players.find(p => String(p.user_id) === String(profileId));
    if (!latestPlayer?.rating) return match;

    // Clone and override the rating for this player
    return {
      ...match,
      teams: match.teams.map(team =>
        team.map(p =>
          p.profile_id === profileId ? { ...p, rating: latestPlayer.rating } : p
        )
      ),
      players: match.players.map(p =>
        p.profile_id === profileId ? { ...p, rating: latestPlayer.rating } : p
      ),
    };
  }, [match, matches, profileId]);

  if (!enrichedMatch) return null;

  return (
    <Box
      borderWidth="1px"
      borderColor="brand.borderWarm"
      borderRadius="md"
      overflow="hidden"
      mb={4}
    >
      <LiveMatchCard match={enrichedMatch} highlightProfileId={profileId} avgRating={getMatchAvgRating(enrichedMatch)} />
    </Box>
  );
}
