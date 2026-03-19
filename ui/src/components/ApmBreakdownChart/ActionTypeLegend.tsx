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
}

export function ActionTypeLegend({
  allActionTypesWithStats,
  activeActionTypes,
  actionTypeColorMap,
  onToggleActionType,
}: ActionTypeLegendProps) {
  return (
    <Box mt={2} px={2} overflow="visible" minH="60px">
      <Flex wrap="wrap" justify="center" align="center" gap={2} w="100%">
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
                gap={2}
                px={2}
                py={1}
                flexShrink={0}
                minW="fit-content"
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
                  w="16px"
                  h="16px"
                  borderRadius="sm"
                  flexShrink={0}
                />
                <Text
                  color="brand.inkDark"
                  fontSize="sm"
                  fontWeight="semibold"
                  maxW="140px"
                  truncate
                  whiteSpace="nowrap"
                  flexShrink={0}
                >
                  {actionType}
                </Text>
                {actionStat.percentage !== null && (
                  <Text
                    color="brand.inkDark"
                    fontSize="xs"
                    fontWeight="bold"
                    flexShrink={0}
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
