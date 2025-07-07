import React from 'react';
import { Box, Text, Spinner, useTheme, Tooltip } from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { checkApmStatus, downloadReplay } from '../services/matchService';

interface APMStatus {
  hasSaveGame: boolean;
  isProcessed: boolean;
  state: 'greyStatus' | 'silverStatus' | 'bronzeStatus';
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
  const theme = useTheme();
  const [apmStatus, setApmStatus] = useState<APMStatus | null>(null);
  const [processing, setProcessing] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    setIsLoading(true);
    const run = async () => {
      try {
        const status = await checkApmStatus(matchId, profileId);
        setApmStatus(status);
        onStatusChange?.(status);
      } finally {
        setIsLoading(false);
      }
    };
    run();
  }, [matchId, profileId, onStatusChange]);

  const handleClick = async () => {
    if (processing || apmStatus?.state !== 'silverStatus') return;
    setProcessing(true);
    try {
      const success = await downloadReplay(matchId, profileId);
      if (success) {
        // Start polling immediately with exponential backoff
        let attempt = 0;
        const maxAttempts = 8; // Max ~30 seconds total
        const poll = async () => {
          if (attempt >= maxAttempts) {
            setProcessing(false);
            return;
          }
          
          const newStatus = await checkApmStatus(matchId, profileId);
          setApmStatus(newStatus);
          onStatusChange?.(newStatus);
          
          if (newStatus.state === 'bronzeStatus') {
            setProcessing(false);
            if (skipBronzeState) {
              // For card variant, skip bronze state and show children immediately
              return;
            }
            return;
          }
          
          // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 32s (capped at 8s)
          const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
          attempt++;
          setTimeout(poll, delay);
        };
        
        // Start polling after 500ms to allow backend to begin processing
        setTimeout(poll, 500);
      } else {
        setProcessing(false);
      }
    } catch {
      setProcessing(false);
    }
  };

  const ready = apmStatus?.state === 'silverStatus';
  const silver = processing || ready;

  if (variant === 'button') {
    const bg = silver
      ? `linear-gradient(135deg, ${theme.colors.brand.brightSilver} 0%, ${theme.colors.brand.lightSteel} 50%, ${theme.colors.brand.brightSilver} 100%)`
      : apmStatus?.state === 'bronzeStatus'
        ? `linear-gradient(135deg, ${theme.colors.brand.bronzeLight} 0%, ${theme.colors.brand.bronze} 40%, ${theme.colors.brand.bronzeMedium} 80%, ${theme.colors.brand.bronzeDark} 100%)`
        : 'brand.steel';

    const fg = processing || (apmStatus?.state === 'greyStatus' || isLoading)
      ? (processing ? 'brand.steel' : 'brand.stoneLight')
      : apmStatus?.state === 'bronzeStatus'
        ? 'brand.brightGold'
        : 'brand.steel';

    const tooltipLabel = processing
      ? 'Processing replay...'
      : isLoading
        ? 'Checking APM status...'
        : apmStatus?.state === 'bronzeStatus'
          ? 'APM Ready'
          : apmStatus?.state === 'silverStatus'
            ? 'Download & Process Replay'
            : 'Replay not found';

    const clickable = (ready && !processing && !isLoading) || apmStatus?.state === 'bronzeStatus';
    const borderColor = silver ? 'brand.brightSilver' : (apmStatus?.state === 'bronzeStatus' ? 'brand.bronze' : 'brand.steel');
    const boxShadow = silver
      ? 'inset 0 1px 2px rgba(255,255,255,0.7), inset 0 -1px 2px rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.25)'
      : (apmStatus?.state === 'bronzeStatus' ? 'inset 0 1px 2px rgba(255,255,255,0.2), 0 1px 3px rgba(0,0,0,0.2)' : 'none');

    const linkProps = apmStatus?.state === 'bronzeStatus' ? { to: `/match/${matchId}#apm` } : {} as const;

    return (
      <Tooltip label={tooltipLabel} fontSize="xs">
        <Box
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
          {processing ? <Spinner size="xs" color="brand.steel" /> : isLoading ? <Spinner size="xs" color="brand.stoneLight" /> : 'APM'}
        </Box>
      </Tooltip>
    );
  }

  // Card variant
  const bg = silver
    ? `linear-gradient(135deg, ${theme.colors.brand.brightSilver} 0%, ${theme.colors.brand.lightSteel} 50%, ${theme.colors.brand.brightSilver} 100%)`
    : apmStatus?.state === 'bronzeStatus'
      ? `linear-gradient(135deg, ${theme.colors.brand.bronzeLight} 0%, ${theme.colors.brand.bronze} 40%, ${theme.colors.brand.bronzeMedium} 80%, ${theme.colors.brand.bronzeDark} 100%)`
      : 'brand.steel';

  const fg = processing || (apmStatus?.state === 'greyStatus' || isLoading)
    ? (processing ? 'brand.steel' : 'brand.stoneLight')
    : apmStatus?.state === 'bronzeStatus'
      ? 'brand.brightGold'
      : 'brand.steel';

  const clickable = (ready && !processing && !isLoading) || apmStatus?.state === 'bronzeStatus';
  const borderColor = silver ? 'brand.brightSilver' : (apmStatus?.state === 'bronzeStatus' ? 'brand.bronze' : 'brand.steel');

  const getCardContent = () => {
    if (processing) {
      return (
        <Box textAlign="center" py={8}>
          <Spinner size="lg" color="brand.steel" mb={4} />
          <Text color="brand.steel" fontWeight="medium">Processing replay...</Text>
          <Text color="brand.stoneLight" fontSize="sm" mt={2}>This may take a few moments</Text>
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
          <Text color="brand.brightGold" fontWeight="bold" fontSize="lg" mb={2}>APM Data Ready</Text>
          <Text color="brand.stoneLight" fontSize="sm">Click to view detailed APM analysis</Text>
        </Box>
      );
    }

    if (apmStatus?.state === 'silverStatus') {
      return (
        <Box textAlign="center" py={8} cursor="pointer" onClick={handleClick}>
          <Text color="brand.steel" fontWeight="bold" fontSize="lg" mb={2}>Generate APM Analysis</Text>
          <Text color="brand.stoneLight" fontSize="sm" mb={4}>
            Click to download and process the replay for APM data
          </Text>
          <Box
            bg="brand.steel"
            color="brand.stoneLight"
            px={6}
            py={2}
            borderRadius="md"
            display="inline-block"
            _hover={{ bg: 'brand.lightSteel' }}
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
      bg={bg}
      color={fg}
      borderRadius="lg"
      border="2px solid"
      borderColor={borderColor}
      minH="200px"
      display="flex"
      alignItems="center"
      justifyContent="center"
      transition="all 0.2s ease-in-out"
      cursor={clickable ? 'pointer' : 'default'}
      _hover={clickable ? { transform: 'translateY(-2px)', boxShadow: 'lg' } : {}}
    >
      {getCardContent()}
    </Box>
  );
} 