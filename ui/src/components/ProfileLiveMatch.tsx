import { Box } from '@chakra-ui/react';
import { useEffect, useState, useRef } from 'react';
import { LiveMatchCard } from './LiveMatchCard';
import { getMatchAvgRating } from './live';
import { getLiveMatchForPlayer } from '../services/liveMatchService';
import type { LiveMatch } from '../types/liveMatch';

const REFRESH_INTERVAL_MS = 30_000;

export function ProfileLiveMatch({ profileId }: { profileId: number }) {
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

  if (!match) return null;

  return (
    <Box
      borderWidth="1px"
      borderColor="brand.borderWarm"
      borderRadius="md"
      overflow="hidden"
      mb={4}
    >
      <LiveMatchCard match={match} highlightProfileId={profileId} avgRating={getMatchAvgRating(match)} />
    </Box>
  );
}
