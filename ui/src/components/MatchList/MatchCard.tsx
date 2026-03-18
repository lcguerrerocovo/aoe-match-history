import { Box, Card } from '@chakra-ui/react';
import { useLayoutConfig } from '../../theme/breakpoints';
import { cardVariant } from '../../types/chakra-overrides';
import type { Match } from '../../types/match';
import { MatchSummaryCard } from './MatchSummaryCard';
import { MapCard } from './MapCard';
import { TeamCard } from './TeamCard';

export function MatchCard({ match, profileId, groupOpen }: { match: Match; profileId: string; groupOpen: boolean }) {
  const layout = useLayoutConfig();

  return (
    <Card.Root variant={cardVariant('match')} role="group">
      <MatchSummaryCard match={match} profileId={profileId} groupOpen={groupOpen} />
      <Box
        display="flex"
        flexDirection={layout?.matchCard.flexDirection}
        gap={layout?.matchCard.gap}
        alignItems={layout?.matchCard.alignItems}
        justifyContent={layout?.matchCard.justifyContent}
        width="100%"
        mt={{ base: 1, md: 2 }}
        data-testid="match-card-content"
      >
        <MapCard match={match} />
        <TeamCard match={match} />
      </Box>
    </Card.Root>
  );
}
