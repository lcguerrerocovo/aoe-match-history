import { HStack, Box, Text, Flex } from '@chakra-ui/react';
export type AnalysisView = 'apm' | 'actions';

interface ChartNavProps {
  activeView: AnalysisView;
  onChangeView: (view: AnalysisView) => void;
  disabled?: boolean;
}

function ApmIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1,8 4,3 7,6 9,2" />
    </svg>
  );
}

function ActionsIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x="1" y="1" width="3" height="8" rx="0.5" />
      <rect x="5" y="3" width="3" height="6" rx="0.5" />
      <line x1="2.5" y1="5" x2="2.5" y2="5.01" strokeWidth={2} />
      <line x1="6.5" y1="6" x2="6.5" y2="6.01" strokeWidth={2} />
    </svg>
  );
}

const navItems: Array<{ view: AnalysisView; label: string; icon: React.FC }> = [
  { view: 'apm', label: 'APM', icon: ApmIcon },
  { view: 'actions', label: 'Actions', icon: ActionsIcon },
];

export function ChartNav({ activeView, onChangeView, disabled }: ChartNavProps) {
  return (
    <HStack
      bg="brand.stoneLight"
      border="1px solid"
      borderColor="brand.inkLight"
      borderRadius="md"
      p="2px"
      gap="2px"
    >
      {navItems.map(({ view, label, icon: Icon }) => {
        const isActive = activeView === view;
        return (
          <Box
            key={view}
            as="button"
            onClick={() => !disabled && onChangeView(view)}
            aria-disabled={disabled || undefined}
            bg={isActive ? 'brand.parchmentDark' : 'transparent'}
            color={isActive ? 'brand.inkDark' : 'brand.inkMuted'}
            borderRadius="sm"
            boxShadow={isActive ? 'sm' : 'none'}
            _hover={isActive || disabled ? {} : { color: 'brand.redChalk' }}
            opacity={disabled ? 0.4 : 1}
            cursor={disabled ? 'not-allowed' : 'pointer'}
            px={2}
            py={1}
            transition="all 0.15s"
          >
            <Flex align="center" gap={1.5}>
              <Icon />
              <Text fontSize="xs" fontWeight="semibold" lineHeight="1">{label}</Text>
            </Flex>
          </Box>
        );
      })}
    </HStack>
  );
}
