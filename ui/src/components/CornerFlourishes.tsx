import type { CSSProperties } from 'react';
import { Box } from '@chakra-ui/react';

function FlourishSvg() {
  return (
    <svg
      viewBox="0 0 60 60"
      width={44}
      height={44}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Main scroll curve — sweeps from corner outward */}
      <path
        d="M4,4 C4,20 10,30 22,36 C30,40 40,42 52,42"
        stroke="#6B5240"
        strokeWidth="1.6"
        opacity="0.45"
        strokeLinecap="round"
      />
      {/* Vertical scroll curve */}
      <path
        d="M4,4 C20,4 30,10 36,22 C40,30 42,40 42,52"
        stroke="#6B5240"
        strokeWidth="1.6"
        opacity="0.45"
        strokeLinecap="round"
      />
      {/* Inner curl — tighter spiral toward corner */}
      <path
        d="M8,8 C8,16 12,22 18,26 C22,28 28,30 36,30"
        stroke="#6B5240"
        strokeWidth="0.8"
        opacity="0.35"
        strokeLinecap="round"
      />
      <path
        d="M8,8 C16,8 22,12 26,18 C28,22 30,28 30,36"
        stroke="#6B5240"
        strokeWidth="0.8"
        opacity="0.35"
        strokeLinecap="round"
      />
      {/* Scroll terminal curl — small spiral at horizontal end */}
      <path
        d="M52,42 C54,40 54,37 51,36"
        stroke="#6B5240"
        strokeWidth="1.2"
        opacity="0.4"
        strokeLinecap="round"
      />
      {/* Scroll terminal curl — small spiral at vertical end */}
      <path
        d="M42,52 C40,54 37,54 36,51"
        stroke="#6B5240"
        strokeWidth="1.2"
        opacity="0.4"
        strokeLinecap="round"
      />
      {/* Small leaf flourish off horizontal arm */}
      <path
        d="M30,36 Q26,42 30,46"
        stroke="#6B5240"
        strokeWidth="0.7"
        opacity="0.3"
        strokeLinecap="round"
      />
      {/* Small leaf flourish off vertical arm */}
      <path
        d="M36,30 Q42,26 46,30"
        stroke="#6B5240"
        strokeWidth="0.7"
        opacity="0.3"
        strokeLinecap="round"
      />
      {/* Red chalk accent dot at corner */}
      <circle cx="6" cy="6" r="2.5" fill="#8B3A3A" opacity="0.45" />
    </svg>
  );
}

const cornerStyles: CSSProperties[] = [
  { top: 4, left: 4 },
  { top: 4, right: 4, transform: 'scaleX(-1)' },
  { bottom: 4, left: 4, transform: 'scaleY(-1)' },
  { bottom: 4, right: 4, transform: 'scale(-1, -1)' },
];

export function CornerFlourishes() {
  return (
    <Box
      display={{ base: 'none', md: 'block' }}
      position="absolute"
      inset={0}
      pointerEvents="none"
      zIndex={0}
    >
      {cornerStyles.map((style, i) => (
        <Box key={i} position="absolute" style={style}>
          <FlourishSvg />
        </Box>
      ))}
    </Box>
  );
}
