import { Box } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { Tooltip } from '../ui/tooltip';

const breathePulse = keyframes`
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.7; }
`;

const fadeInScale = keyframes`
  from { opacity: 0; transform: scale(0.6); }
  to { opacity: 1; transform: scale(1); }
`;

interface AnalysisIndicatorProps {
  state: 'none' | 'processing' | 'new' | 'ready';
  onAnimationEnd?: () => void;
}

export function AnalysisIndicator({ state, onAnimationEnd }: AnalysisIndicatorProps) {
  if (state === 'none') return <Box w="24px" h="24px" flexShrink={0} />;

  const isAnimating = state === 'processing';
  const isNew = state === 'new';

  const indicator = (
      <Box
        w="24px"
        h="24px"
        borderRadius="full"
        bg={isAnimating ? 'brand.inkLight' : 'brand.redChalk'}
        display="flex"
        alignItems="center"
        justifyContent="center"
        flexShrink={0}
        css={
          isAnimating
            ? { animation: `${breathePulse} 2s ease-in-out infinite` }
            : isNew
              ? { animation: `${fadeInScale} 0.4s ease-out forwards` }
              : undefined
        }
        onAnimationEnd={isNew ? onAnimationEnd : undefined}
      >
        {/* 3-bar chart SVG */}
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <rect x="1" y="6" width="2.5" height="5" rx="0.5" fill="white" opacity={isAnimating ? 0.5 : 0.9} />
          <rect x="4.75" y="3" width="2.5" height="8" rx="0.5" fill="white" opacity={isAnimating ? 0.5 : 0.9} />
          <rect x="8.5" y="1" width="2.5" height="10" rx="0.5" fill="white" opacity={isAnimating ? 0.5 : 0.9} />
        </svg>
      </Box>
  );

  if (isAnimating) return indicator;

  return (
    <Tooltip content="Analysis available" fontSize="xs">
      {indicator}
    </Tooltip>
  );
}
