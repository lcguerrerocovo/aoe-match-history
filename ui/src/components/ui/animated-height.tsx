import { useRef, useState, useEffect, type ReactNode } from 'react';
import { Box } from '@chakra-ui/react';

interface AnimatedHeightProps {
  children: ReactNode;
  duration?: number;
}

/**
 * Wrapper that smoothly animates height changes when its children change size.
 * Uses ResizeObserver to track content height and CSS transition for smooth flow.
 */
export function AnimatedHeight({ children, duration = 400 }: AnimatedHeightProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>(undefined);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    let measured = false;

    const observer = new ResizeObserver(([entry]) => {
      const newHeight = entry.contentRect.height;
      setHeight(newHeight);
      if (!measured) {
        // First measurement (initial render) — enable transitions after it commits
        measured = true;
        requestAnimationFrame(() => {
          setAnimate(true);
        });
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Box
      overflow="hidden"
      style={{
        height: height !== undefined ? `${height}px` : 'auto',
        transition: animate ? `height ${duration}ms ease-out` : 'none',
      }}
    >
      <Box ref={contentRef}>
        {children}
      </Box>
    </Box>
  );
}
