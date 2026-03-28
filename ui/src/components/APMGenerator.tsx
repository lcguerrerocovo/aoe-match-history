import { Box, Spinner } from '@chakra-ui/react';
import { Tooltip } from './ui/tooltip';
import { useState, useEffect, useRef } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { checkApmStatus, checkApmStatusForMatch, downloadReplay } from '../services/matchService';
import type { APMStatus } from './Analysis/useApmGeneration';

interface APMGeneratorProps {
  matchId: string;
  profileId: string;
}

export function APMGenerator({
  matchId,
  profileId,
}: APMGeneratorProps) {
  const [apmStatus, setApmStatus] = useState<APMStatus | null>(null);
  const [processing, setProcessing] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Only fetch APM status when the component scrolls into view
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    if (isRefreshing) return;

    setIsLoading(true);
    const run = async () => {
      try {
        const status = await checkApmStatusForMatch(matchId);
        setApmStatus(status);
      } finally {
        setIsLoading(false);
      }
    };
    run();
  }, [matchId, isRefreshing, isVisible]);

  // Reset refreshing/error state when matchId changes (new match loaded)
  useEffect(() => {
    setIsRefreshing(false);
    setError(null);
  }, [matchId]);

  const handleClick = async () => {
    if (processing || apmStatus?.state !== 'silverStatus') return;
    setProcessing(true);
    setError(null);
    try {
      const downloadProfileId = apmStatus?.profileId || profileId;
      const result = await downloadReplay(matchId, downloadProfileId);
      if (result.success) {
        let attempt = 0;
        const maxAttempts = 8;
        const poll = async () => {
          if (attempt >= maxAttempts) {
            setProcessing(false);
            return;
          }

          const newStatus = await checkApmStatus(matchId, profileId);
          setApmStatus(newStatus);

          if (newStatus.state === 'bronzeStatus') {
            setProcessing(false);
            return;
          }

          const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
          attempt++;
          setTimeout(poll, delay);
        };

        setTimeout(poll, 500);
      } else {
        setProcessing(false);
        setError(result.error || 'Replay server busy \u2014 try again later');
      }
    } catch {
      setProcessing(false);
      setError('Failed to process replay');
    }
  };

  const ready = apmStatus?.state === 'silverStatus';
  const silver = processing || ready;
  const isBronze = apmStatus?.state === 'bronzeStatus';

  const bg = silver
    ? 'brand.inkLight'
    : isBronze
      ? 'brand.redChalk'
      : 'brand.inkMuted';

  const fg = processing || (apmStatus?.state === 'greyStatus' || isLoading)
    ? (processing ? 'brand.inkMuted' : 'brand.stoneLight')
    : isBronze
      ? 'brand.parchment'
      : 'brand.inkMuted';

  const tooltipLabel = error
    ? error
    : processing
      ? 'Processing...'
      : isLoading
        ? 'Checking...'
        : isBronze
          ? 'View analysis'
          : ready
            ? 'Generate analysis'
            : 'Replay not available';

  const clickable = (ready && !processing && !isLoading) || isBronze;
  const borderColor = error
    ? 'brand.brightRed'
    : silver ? 'brand.inkMuted' : (isBronze ? 'brand.redChalk' : 'brand.inkMuted');

  const linkProps = isBronze ? { to: `/match/${matchId}#apm` } : {} as const;

  return (
    <Tooltip content={tooltipLabel} fontSize="xs">
      <Box
        ref={containerRef}
        as={isBronze ? RouterLink : 'button'}
        onClick={isBronze ? undefined : handleClick}
        bg={bg}
        color={fg}
        w="28px"
        h="28px"
        borderRadius="full"
        border="1px solid"
        borderColor={borderColor}
        boxShadow="none"
        fontSize="2xs"
        fontWeight="bold"
        display="flex"
        alignItems="center"
        justifyContent="center"
        lineHeight="1"
        cursor={clickable ? 'pointer' : 'not-allowed'}
        transition="all 0.2s ease-in-out"
        {...linkProps}
      >
        {processing ? (
          <Spinner size="xs" color="brand.inkMuted" />
        ) : isLoading ? (
          <Spinner size="xs" color="brand.stoneLight" />
        ) : (
          <svg viewBox="0 0 10 10" width="10" height="10" aria-hidden="true">
            <rect x="1" y="5" width="2" height="4" rx="0.5" fill="currentColor" />
            <rect x="4" y="3" width="2" height="6" rx="0.5" fill="currentColor" />
            <rect x="7" y="1" width="2" height="8" rx="0.5" fill="currentColor" />
          </svg>
        )}
      </Box>
    </Tooltip>
  );
}
