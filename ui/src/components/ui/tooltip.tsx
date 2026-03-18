import { Tooltip as ChakraTooltip } from '@chakra-ui/react';
import type { ReactNode, ReactElement } from 'react';

interface TooltipProps {
  content: ReactNode;
  children: ReactElement;
  label?: ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  hasArrow?: boolean;
  fontSize?: string;
  bg?: string;
  color?: string;
  border?: string;
  borderColor?: string;
  borderRadius?: string;
  p?: number | string;
  maxW?: string;
}

export function Tooltip({ content, label, children, ...rest }: TooltipProps) {
  const tooltipContent = content || label;
  const { fontSize, bg, color, border, borderColor, borderRadius, p, maxW, ...positionerProps } = rest;

  return (
    <ChakraTooltip.Root>
      <ChakraTooltip.Trigger asChild>
        {children}
      </ChakraTooltip.Trigger>
      <ChakraTooltip.Positioner {...positionerProps}>
        <ChakraTooltip.Content
          fontSize={fontSize}
          bg={bg}
          color={color}
          border={border}
          borderColor={borderColor}
          borderRadius={borderRadius}
          p={p}
          maxW={maxW}
        >
          {tooltipContent}
        </ChakraTooltip.Content>
      </ChakraTooltip.Positioner>
    </ChakraTooltip.Root>
  );
}
