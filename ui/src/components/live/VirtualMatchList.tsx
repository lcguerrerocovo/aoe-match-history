import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Box } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { LiveMatchCard } from '../LiveMatchCard';
import type { LiveMatch } from '../../types/liveMatch';

const cardEnter = keyframes`
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
`;

const cardFlash = keyframes`
  0% { background-color: transparent; }
  30% { background-color: var(--chakra-colors-brand-parchmentDark); }
  100% { background-color: transparent; }
`;

interface VirtualMatchListProps {
  matches: LiveMatch[];
  avgRatings: Map<number, number | null>;
  newMatchIds: Set<number>;
  onNewMatchAnimated: (matchId: number) => void;
}

export function VirtualMatchList({
  matches,
  avgRatings,
  newMatchIds,
  onNewMatchAnimated,
}: VirtualMatchListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: matches.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const match = matches[index];
      const maxTeamSize = match.teams.reduce(
        (max, t) => Math.max(max, t.length),
        0,
      );
      // header ~40px + players ~30px each + footer ~28px + margin 12px
      return 40 + maxTeamSize * 30 + 28 + 12;
    },
    overscan: 3,
    measureElement: (el) => el.getBoundingClientRect().height,
  });

  return (
    <Box
      ref={parentRef}
      overflow="auto"
      h="calc(100vh - 260px)"
      css={{
        '&::-webkit-scrollbar': { display: 'none' },
        scrollbarWidth: 'none',
      }}
    >
      <Box
        h={`${virtualizer.getTotalSize()}px`}
        w="100%"
        position="relative"
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const match = matches[virtualRow.index];
          const isNew = newMatchIds.has(match.match_id);
          return (
            <Box
              key={match.match_id}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              position="absolute"
              top={0}
              left={0}
              w="100%"
              transform={`translateY(${virtualRow.start}px)`}
              css={
                isNew
                  ? {
                      animation: `${cardEnter} 0.4s ease-out, ${cardFlash} 1.2s ease-out`,
                    }
                  : undefined
              }
              onAnimationEnd={(e) => {
                if (isNew && e.animationName === cardFlash.name) {
                  onNewMatchAnimated(match.match_id);
                }
              }}
            >
              <LiveMatchCard
                match={match}
                avgRating={avgRatings.get(match.match_id)}
              />
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
