import { Box, Text, Flex, Button } from '@chakra-ui/react';
import { useThemeMode } from '../../theme/ThemeProvider';
import { getPlayerColor } from './utils';

interface PlayerSelectorProps {
  sortedPlayerIds: string[];
  selectedPlayerId: string;
  onSelectPlayer: (pid: string) => void;
  nameByProfile: Record<string, string | undefined>;
  colorByProfile: Record<string, number | undefined>;
  playerAverages: Record<string, number>;
}

export function PlayerSelector({
  sortedPlayerIds,
  selectedPlayerId,
  onSelectPlayer,
  nameByProfile,
  colorByProfile,
  playerAverages,
}: PlayerSelectorProps) {
  const { isDark } = useThemeMode();

  return (
    <Flex
      justify="center"
      mb={4}
      wrap="wrap"
      gap={2}
      px={2}
    >
      {sortedPlayerIds.map((pid) => {
        const name = nameByProfile[pid] || pid;
        const isSelected = pid === selectedPlayerId;
        const colorId = colorByProfile[pid];
        const playerColor = getPlayerColor(colorId, isDark);
        const playerAvg = playerAverages[pid] || 0;

        return (
          <Button
            key={pid}
            size="sm"
            variant="outline"
            colorPalette="brand"
            bg={isSelected ? 'brand.parchmentDark' : (isDark ? 'transparent' : 'brand.stoneLight')}
            color={isDark ? 'brand.parchment' : 'brand.inkDark'}
            borderColor={isSelected ? (isDark ? 'brand.parchment' : 'brand.inkDark') : 'brand.borderWarm'}
            _hover={{
              bg: 'brand.parchmentDark',
            }}
            onClick={() => onSelectPlayer(pid)}
            maxW="220px"
            h="auto"
            py={2}
            px={3}
          >
            <Flex align="center" justify="space-between" w="100%" gap={2}>
              <Flex align="center" gap={2}>
                <Box
                  w="12px"
                  h="12px"
                  borderRadius="full"
                  bg={playerColor}
                  border="1px solid"
                  borderColor="brand.borderWarm"
                  flexShrink={0}
                />
                <Text
                  fontSize="xs"
                  fontWeight={isSelected ? 'bold' : 'semibold'}
                  maxW="120px"
                  truncate
                  color={isDark ? 'brand.parchment' : 'brand.inkDark'}
                >
                  {name}
                </Text>
              </Flex>
              {isSelected && (
                <Box
                  bg="brand.stoneLight"
                  border="1px solid"
                  borderColor="brand.borderWarm"
                  borderRadius="sm"
                  px={2}
                  py={1}
                  flexShrink={0}
                >
                  <Text
                    fontSize="xs"
                    fontWeight="bold"
                    color="brand.inkDark"
                  >
                    {playerAvg}
                  </Text>
                </Box>
              )}
            </Flex>
          </Button>
        );
      })}
    </Flex>
  );
}
