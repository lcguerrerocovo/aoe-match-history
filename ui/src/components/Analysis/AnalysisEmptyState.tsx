import { Flex, Spinner, Text } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';

interface AnalysisEmptyStateProps {
  status: 'loading' | 'processing' | 'unavailable';
}

export function AnalysisEmptyState({ status }: AnalysisEmptyStateProps) {
  const { t } = useTranslation();
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
      <Text fontSize="md" color="brand.inkMuted" fontStyle="italic">{t('match.noAnalysisData')}</Text>
      <Text fontSize="sm" color="brand.inkMuted">{t('match.noReplays')}</Text>
    </Flex>
  );
}
