import { useState, useEffect, useRef, useCallback } from 'react';
import { checkApmStatus, checkApmStatusForMatch, downloadReplay } from '../../services/matchService';
import type { APMStatus } from '../APMGenerator';

interface UseApmGenerationOptions {
  onBronzeStatus?: () => void;
}

export function useApmGeneration(
  matchId: string,
  profileId: string,
  options?: UseApmGenerationOptions
) {
  const [status, setStatus] = useState<APMStatus | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const onBronzeStatusRef = useRef(options?.onBronzeStatus);
  onBronzeStatusRef.current = options?.onBronzeStatus;

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
        const result = await checkApmStatusForMatch(matchId);
        setStatus(result);
      } finally {
        setIsLoading(false);
      }
    };
    run();
  }, [matchId, isRefreshing, isVisible]);

  // Reset refreshing/error state when matchId changes
  useEffect(() => {
    setIsRefreshing(false);
    setError(null);
  }, [matchId]);

  const generate = useCallback(async () => {
    if (isProcessing || status?.state !== 'silverStatus') return;
    setIsProcessing(true);
    setError(null);
    try {
      const downloadProfileId = status?.profileId || profileId;
      const result = await downloadReplay(matchId, downloadProfileId);
      if (result.success) {
        let attempt = 0;
        const maxAttempts = 8;
        const poll = async () => {
          if (attempt >= maxAttempts) {
            setIsProcessing(false);
            return;
          }

          const newStatus = await checkApmStatus(matchId, profileId);

          if (newStatus.state === 'bronzeStatus') {
            setIsProcessing(false);
            setIsRefreshing(true);
            onBronzeStatusRef.current?.();
            return;
          }

          setStatus(newStatus);

          const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
          attempt++;
          setTimeout(poll, delay);
        };

        setTimeout(poll, 500);
      } else {
        setIsProcessing(false);
        setError(result.error || 'Replay server busy — try again later');
      }
    } catch {
      setIsProcessing(false);
      setError('Failed to process replay');
    }
  }, [isProcessing, status, profileId, matchId]);

  return { status, isLoading, isProcessing, error, generate, containerRef };
}
