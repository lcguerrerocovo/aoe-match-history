import { HStack, Text } from '@chakra-ui/react';
import { ChartNav } from './ChartNav';
import type { AnalysisView } from './ChartNav';

interface AnalysisHeaderProps {
  activeView: AnalysisView;
  onChangeView: (view: AnalysisView) => void;
  disabled?: boolean;
}

const VIEW_TITLES: Record<AnalysisView, string> = {
  apm: 'APM Over Time',
  actions: 'Action Breakdown',
};

export function AnalysisHeader({ activeView, onChangeView, disabled }: AnalysisHeaderProps) {
  return (
    <HStack w="100%" justify="space-between" align="center">
      <Text
        fontSize="md"
        fontWeight="semibold"
        fontStyle="italic"
        color="brand.inkDark"
      >
        {VIEW_TITLES[activeView]}
      </Text>
      <ChartNav activeView={activeView} onChangeView={onChangeView} disabled={disabled} />
    </HStack>
  );
}
