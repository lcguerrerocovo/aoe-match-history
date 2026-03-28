import { Button, Flex, Spinner, Text } from '@chakra-ui/react';
import type { APMStatus } from '../APMGenerator';

interface AnalysisEmptyStateProps {
  status: APMStatus | null;
  isLoading: boolean;
  isProcessing: boolean;
  error: string | null;
  onGenerate: () => void;
}

export function AnalysisEmptyState({
  status,
  isLoading,
  isProcessing,
  error,
  onGenerate,
}: AnalysisEmptyStateProps) {
  if (isLoading) {
    return (
      <Flex direction="column" align="center" justify="center" h="100%" w="100%" gap={3}>
        <Spinner size="md" color="brand.inkMuted" />
        <Text fontSize="sm" color="brand.inkMuted">Checking availability...</Text>
      </Flex>
    );
  }

  if (isProcessing) {
    return (
      <Flex direction="column" align="center" justify="center" h="100%" w="100%" gap={3}>
        <Spinner size="md" color="brand.inkMuted" />
        <Text fontSize="sm" color="brand.inkMuted">Processing replay...</Text>
      </Flex>
    );
  }

  if (error) {
    return (
      <Flex direction="column" align="center" justify="center" h="100%" w="100%" gap={3}>
        <Text fontSize="sm" color="brand.brightRed">{error}</Text>
        <Button variant="ghost" size="sm" onClick={onGenerate}>
          Try again
        </Button>
      </Flex>
    );
  }

  if (status?.state === 'silverStatus') {
    return (
      <Flex direction="column" align="center" justify="center" h="100%" w="100%" gap={3}>
        <Text fontSize="md" color="brand.inkMuted" fontStyle="italic">No analysis data</Text>
        <Text fontSize="sm" color="brand.inkLight">Replay available</Text>
        <Button variant="ghost" size="sm" onClick={onGenerate}>
          Generate
        </Button>
      </Flex>
    );
  }

  if (status?.state === 'greyStatus') {
    return (
      <Flex direction="column" align="center" justify="center" h="100%" w="100%" gap={3}>
        <Text fontSize="md" color="brand.inkMuted" fontStyle="italic">No analysis data</Text>
        <Text fontSize="sm" color="brand.inkMuted">Replay not available for this match</Text>
      </Flex>
    );
  }

  // Default / null status (before status is fetched)
  return (
    <Flex direction="column" align="center" justify="center" h="100%" w="100%" gap={3}>
      <Text fontSize="md" color="brand.inkMuted" fontStyle="italic">No analysis data</Text>
    </Flex>
  );
}
