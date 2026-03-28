import { HStack, IconButton, Box } from '@chakra-ui/react';
import { Tooltip } from '../ui/tooltip';
export type AnalysisView = 'apm' | 'actions';

interface ChartNavProps {
  activeView: AnalysisView;
  onChangeView: (view: AnalysisView) => void;
  disabled?: boolean;
}

function ApmIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1,8 4,3 7,6 9,2" />
    </svg>
  );
}

function ActionsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x="1" y="1" width="3" height="8" rx="0.5" />
      <rect x="5" y="3" width="3" height="6" rx="0.5" />
      <line x1="2.5" y1="5" x2="2.5" y2="5.01" strokeWidth={2} />
      <line x1="6.5" y1="6" x2="6.5" y2="6.01" strokeWidth={2} />
    </svg>
  );
}

export function ChartNav({ activeView, onChangeView, disabled }: ChartNavProps) {
  const buttonStyle = (isActive: boolean) => ({
    bg: isActive ? 'brand.parchmentDark' : 'transparent',
    color: isActive ? 'brand.inkDark' : 'brand.inkMuted',
    borderRadius: 'sm',
    boxShadow: isActive ? 'sm' : 'none',
    _hover: isActive ? {} : { color: 'brand.redChalk' },
  });

  return (
    <HStack
      bg="brand.stoneLight"
      border="1px solid"
      borderColor="brand.inkLight"
      borderRadius="md"
      p="2px"
      gap="2px"
    >
      <Tooltip content="APM over time">
        <Box>
          <IconButton
            aria-label="APM over time"
            size="xs"
            variant="ghost"
            w="32px"
            h="32px"
            onClick={() => onChangeView('apm')}
            disabled={disabled}
            opacity={disabled ? 0.4 : 1}
            cursor={disabled ? 'not-allowed' : 'pointer'}
            {...buttonStyle(activeView === 'apm')}
          >
            <ApmIcon />
          </IconButton>
        </Box>
      </Tooltip>
      <Tooltip content="Action breakdown">
        <Box>
          <IconButton
            aria-label="Action breakdown"
            size="xs"
            variant="ghost"
            w="32px"
            h="32px"
            onClick={() => onChangeView('actions')}
            disabled={disabled}
            opacity={disabled ? 0.4 : 1}
            cursor={disabled ? 'not-allowed' : 'pointer'}
            {...buttonStyle(activeView === 'actions')}
          >
            <ActionsIcon />
          </IconButton>
        </Box>
      </Tooltip>
    </HStack>
  );
}
