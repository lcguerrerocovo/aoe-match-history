import { Flex, Spinner, Text } from '@chakra-ui/react';

interface AnalysisEmptyStateProps {
  status: 'loading' | 'processing' | 'unavailable';
}

export function AnalysisEmptyState({ status }: AnalysisEmptyStateProps) {
  if (status === 'loading' || status === 'processing') {
    return (
      <Flex direction="column" align="center" justify="center" h="100%" w="100%" gap={3}>
        <Spinner size="md" color="brand.inkMuted" />
        <Text fontSize="sm" color="brand.inkMuted">
          {status === 'loading' ? 'Checking availability...' : 'Processing replay...'}
        </Text>
      </Flex>
    );
  }

  return (
    <Flex direction="column" align="center" justify="center" h="100%" w="100%" gap={3}>
      <Text fontSize="md" color="brand.inkMuted" fontStyle="italic">No analysis data</Text>
      <Text fontSize="sm" color="brand.inkMuted">No replays available for this match</Text>
    </Flex>
  );
}
