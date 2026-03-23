import React from 'react';
import { Box, Text, Spinner } from '@chakra-ui/react';
import { Tooltip } from './ui/tooltip';
import { useState, useEffect, useRef } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { checkApmStatus, checkApmStatusForMatch, downloadReplay } from '../services/matchService';

interface APMStatus {
  hasSaveGame: boolean;
  isProcessed: boolean;
  state: 'greyStatus' | 'silverStatus' | 'bronzeStatus';
  profileId?: string;
}

interface APMGeneratorProps {
  matchId: string;
  profileId: string;
  variant?: 'button' | 'card';
  onStatusChange?: (status: APMStatus | null) => void;
  children?: React.ReactNode;
  skipBronzeState?: boolean;
}

export function APMGenerator({
  matchId,
  profileId,
  variant = 'button',
  onStatusChange,
  children,
  skipBronzeState = false
}: APMGeneratorProps) {
  const [apmStatus, setApmStatus] = useState<APMStatus | null>(null);
  const [processing, setProcessing] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Use ref for onStatusChange to avoid re-triggering the effect on every render
  const onStatusChangeRef = useRef(onStatusChange);
  onStatusChangeRef.current = onStatusChange;

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
    if (isRefreshing) return; // Skip status check if we're refreshing

    setIsLoading(true);
    const run = async () => {
      try {
        const status = await checkApmStatusForMatch(matchId);
        setApmStatus(status);
        onStatusChangeRef.current?.(status);
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
      // Use profileId from status check (which confirmed replay availability) over the prop
      const downloadProfileId = apmStatus?.profileId || profileId;
      const result = await downloadReplay(matchId, downloadProfileId);
      if (result.success) {
        // Start polling immediately with exponential backoff
        let attempt = 0;
        const maxAttempts = 8;
        const poll = async () => {
          if (attempt >= maxAttempts) {
            setProcessing(false);
            return;
          }

          const newStatus = await checkApmStatus(matchId, profileId);

          if (newStatus.state === 'bronzeStatus' && skipBronzeState) {
            setProcessing(false);
            setIsRefreshing(true);
            onStatusChange?.(newStatus);
            return;
          }

          setApmStatus(newStatus);
          onStatusChange?.(newStatus);

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
        setError(result.error || 'Replay server busy — try again later');
      }
    } catch {
      setProcessing(false);
      setError('Failed to process replay');
    }
  };

  const ready = apmStatus?.state === 'silverStatus';
  const silver = processing || ready;

  if (variant === 'button') {
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
        ? 'Processing replay...'
        : isLoading
          ? 'Checking APM status...'
          : apmStatus?.state === 'bronzeStatus'
            ? 'APM Ready'
            : apmStatus?.state === 'silverStatus'
              ? 'Download & Process Replay'
              : 'Replay not found';

    const clickable = (ready && !processing && !isLoading) || apmStatus?.state === 'bronzeStatus';
    const borderColor = error
      ? 'brand.brightRed'
      : silver ? 'brand.inkMuted' : (isBronze ? 'brand.redChalk' : 'brand.inkMuted');
    const boxShadow = 'none';

    const linkProps = apmStatus?.state === 'bronzeStatus' ? { to: `/match/${matchId}#apm` } : {} as const;

    return (
      <Tooltip content={tooltipLabel} fontSize="xs">
        <Box
          ref={containerRef}
          as={apmStatus?.state === 'bronzeStatus' ? RouterLink : 'button'}
          onClick={apmStatus?.state === 'bronzeStatus' ? undefined : handleClick}
          bg={bg}
          color={fg}
          w="28px"
          h="28px"
          borderRadius="full"
          border="1px solid"
          borderColor={borderColor}
          boxShadow={boxShadow}
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
          {processing ? <Spinner size="xs" color="brand.inkMuted" /> : isLoading ? <Spinner size="xs" color="brand.stoneLight" /> : 'APM'}
        </Box>
      </Tooltip>
    );
  }

  // Card variant
  const bg = silver
    ? 'brand.inkLight'
    : apmStatus?.state === 'bronzeStatus'
      ? 'brand.inkMuted'
      : 'brand.inkMuted';

  const fg = processing || (apmStatus?.state === 'greyStatus' || isLoading)
    ? (processing ? 'brand.inkMuted' : 'brand.stoneLight')
    : apmStatus?.state === 'bronzeStatus'
      ? 'brand.redChalk'
      : 'brand.inkMuted';

  const clickable = (ready && !processing && !isLoading) || apmStatus?.state === 'bronzeStatus';
  const borderColor = silver ? 'brand.inkMuted' : (apmStatus?.state === 'bronzeStatus' ? 'brand.redChalk' : 'brand.inkMuted');

  const getCardContent = () => {
    if (processing) {
      return (
        <Box textAlign="center" py={8}>
          <Spinner size="lg" color="brand.inkMuted" mb={4} />
          <Text color="brand.inkMuted" fontWeight="medium">Processing replay...</Text>
          <Text color="brand.stoneLight" fontSize="sm" mt={2}>This may take a few moments</Text>
        </Box>
      );
    }

    if (error) {
      return (
        <Box textAlign="center" py={8}>
          <Text color="brand.brightRed" fontWeight="bold" fontSize="lg" mb={2}>Processing Failed</Text>
          <Text color="brand.stoneLight" fontSize="sm" mb={4}>{error}</Text>
          <Box
            bg="brand.inkMuted"
            color="brand.stoneLight"
            px={6}
            py={2}
            borderRadius="md"
            display="inline-block"
            cursor="pointer"
            onClick={handleClick}
            _hover={{ bg: 'brand.inkLight' }}
            transition="all 0.2s ease-in-out"
          >
            Try Again
          </Box>
        </Box>
      );
    }

    if (isLoading) {
      return (
        <Box textAlign="center" py={8}>
          <Spinner size="lg" color="brand.stoneLight" mb={4} />
          <Text color="brand.stoneLight" fontWeight="medium">Checking APM availability...</Text>
        </Box>
      );
    }

    if (apmStatus?.state === 'bronzeStatus') {
      if (skipBronzeState && children) {
        return children;
      }
      return children || (
        <Box textAlign="center" py={8}>
          <Text color="brand.redChalk" fontWeight="bold" fontSize="lg" mb={2}>APM Data Ready</Text>
          <Text color="brand.stoneLight" fontSize="sm">Click to view detailed APM analysis</Text>
        </Box>
      );
    }

    if (apmStatus?.state === 'silverStatus') {
      return (
        <Box textAlign="center" py={8} cursor="pointer" onClick={handleClick}>
          <Text color="brand.inkMuted" fontWeight="bold" fontSize="lg" mb={2}>Generate APM Analysis</Text>
          <Text color="brand.stoneLight" fontSize="sm" mb={4}>
            Click to download and process the replay for APM data
          </Text>
          <Box
            bg="brand.inkMuted"
            color="brand.stoneLight"
            px={6}
            py={2}
            borderRadius="md"
            display="inline-block"
            _hover={{ bg: 'brand.inkLight' }}
            transition="all 0.2s ease-in-out"
          >
            Generate APM
          </Box>
        </Box>
      );
    }

    return (
      <Box textAlign="center" py={8}>
        <Text color="brand.stoneLight" fontWeight="medium" fontSize="lg" mb={2}>APM Not Available</Text>
        <Text color="brand.stoneLight" fontSize="sm">Replay data not found for this match</Text>
      </Box>
    );
  };

  return (
    <Box
      ref={containerRef}
      bg={bg}
      color={fg}
      borderRadius="sm"
      border="1px solid"
      borderColor={borderColor}
      minH="200px"
      display="flex"
      alignItems="center"
      justifyContent="center"
      transition="all 0.2s ease-in-out"
      cursor={clickable ? 'pointer' : 'default'}
      _hover={clickable ? { transform: 'translateY(-1px)' } : {}}
    >
      {getCardContent()}
    </Box>
  );
}
