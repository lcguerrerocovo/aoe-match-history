import { Box, Text, Flex } from '@chakra-ui/react';
import { Tooltip as ChakraTooltip } from '../ui/tooltip';
import actionTypeDescriptions from '../../data/action_type_descriptions.json';
import { getColorByIndex } from './utils';

interface ActionTypeWithStats {
  actionType: string;
  total: number;
  percentage: number | null;
}

interface ActionTypeLegendProps {
  allActionTypesWithStats: ActionTypeWithStats[];
  activeActionTypes: Set<string>;
  actionTypeColorMap: Record<string, number>;
  onToggleActionType: (actionType: string) => void;
  hidden?: boolean;
}

export function ActionTypeLegend({
  allActionTypesWithStats,
  activeActionTypes,
  actionTypeColorMap,
  onToggleActionType,
  hidden,
}: ActionTypeLegendProps) {
  return (
    <Box
      borderTop="1px solid"
      borderColor={hidden ? 'transparent' : 'brand.borderWarm'}
      pt={2}
      px={2}
      visibility={hidden ? 'hidden' : 'visible'}
    >
      <Flex wrap="wrap" justify="center" align="center" gap={1.5} w="100%">
        {allActionTypesWithStats.map((actionStat) => {
          const actionType = actionStat.actionType;
          const isActive = activeActionTypes.has(actionType);
          const description = actionTypeDescriptions[actionType as keyof typeof actionTypeDescriptions] || 'No description available.';

          return (
            <ChakraTooltip
              key={actionType}
              content={description}
              placement="top"
              hasArrow
              bg="brand.parchment"
              color="brand.inkDark"
              border="1px solid"
              borderColor="brand.borderWarm"
              borderRadius="md"
              p={2}
              fontSize="sm"
              maxW="300px"
            >
              <Flex
                align="center"
                gap={1.5}
                px={1.5}
                py={0.5}
                bg={isActive ? 'brand.stoneLight' : 'brand.fadedParchment'}
                borderRadius="md"
                border="1px solid"
                borderColor={isActive ? 'brand.borderWarm' : 'brand.inkLight'}
                opacity={isActive ? 1 : 0.6}
                cursor="pointer"
                onClick={() => onToggleActionType(actionType)}
                _hover={{
                  opacity: 1,
                  bg: 'brand.stoneLight',
                }}
              >
                <Box
                  bg={getColorByIndex(actionTypeColorMap[actionType] || 0)}
                  w="14px"
                  h="14px"
                  borderRadius="sm"
                  flexShrink={0}
                />
                <Text
                  color="brand.inkDark"
                  fontSize="xs"
                  fontWeight="semibold"
                  maxW="120px"
                  truncate
                  whiteSpace="nowrap"
                >
                  {actionType}
                </Text>
                {actionStat.percentage !== null && (
                  <Text
                    color="brand.inkMuted"
                    fontSize="xs"
                    fontWeight="bold"
                  >
                    {actionStat.percentage}%
                  </Text>
                )}
              </Flex>
            </ChakraTooltip>
          );
        })}
      </Flex>
    </Box>
  );
}
