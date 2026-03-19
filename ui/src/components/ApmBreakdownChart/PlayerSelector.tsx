import { Box, Text, Flex, Button } from '@chakra-ui/react';
import { useThemeMode } from '../../theme/ThemeProvider';
import { getTextColorForBackground, getTextShadowForBackground } from '../../utils/colorUtils';
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
            variant={isSelected ? "solid" : "outline"}
            colorPalette="brand"
            bg={isSelected ? playerColor : "transparent"}
            color={isSelected ? getTextColorForBackground(playerColor, isDark, '#fff', '#111') : (isDark ? '#F7FAFC' : '#19214E')}
            borderColor={playerColor}
            _hover={{
              bg: isSelected ? playerColor : playerColor,
              color: getTextColorForBackground(playerColor, isDark, '#fff', '#111'),
            }}
            onClick={() => onSelectPlayer(pid)}
            maxW="200px"
            h="auto"
            py={2}
            px={3}
          >
            <Flex align="center" justify="space-between" w="100%" gap={2}>
              <Text
                fontSize="xs"
                fontWeight="semibold"
                flexShrink={0}
                maxW="120px"
                truncate
                color={isSelected ? getTextColorForBackground(playerColor, isDark, '#fff', '#111') : (isDark ? '#F7FAFC' : '#19214E')}
                style={{
                  textShadow: isSelected ? getTextShadowForBackground(playerColor, isDark) : 'none'
                }}
              >
                {name}
              </Text>
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
                    color={getTextColorForBackground(isDark ? '#1A202C' : '#F2F0EA', isDark, '#fff', '#111')}
                    style={{
                      textShadow: getTextShadowForBackground(isDark ? '#1A202C' : '#F2F0EA', isDark)
                    }}
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
