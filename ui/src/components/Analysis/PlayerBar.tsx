import { Button, Box, Text, Flex } from '@chakra-ui/react';
import { useThemeMode } from '../../theme/ThemeProvider';
import { getPlayerColor } from '../ApmBreakdownChart/utils';

interface PlayerBarProps {
  players: Array<{ pid: string; name: string; colorId: number; avgApm: number }>;
  activePids: string[];
  onToggle: (pid: string) => void;
}

export function PlayerBar({ players, activePids, onToggle }: PlayerBarProps) {
  const { isDark } = useThemeMode();

  return (
    <Flex
      wrap="wrap"
      justify={{ base: 'flex-start', md: 'center' }}
      gap={1}
      w="100%"
      minH="36px"
      px={1}
    >
      {players.map(({ pid, name, colorId, avgApm }) => {
        const isActive = activePids.includes(pid);
        const playerColor = getPlayerColor(colorId, isDark);

        return (
          <Button
            key={pid}
            size="sm"
            variant="outline"
            colorPalette="brand"
            bg={isActive ? 'brand.parchmentDark' : (isDark ? 'transparent' : 'brand.stoneLight')}
            color={isDark ? 'brand.parchment' : 'brand.inkDark'}
            borderColor={isActive ? (isDark ? 'brand.parchment' : 'brand.inkDark') : 'brand.borderWarm'}
            _hover={{ bg: 'brand.parchmentDark' }}
            onClick={() => onToggle(pid)}
            maxW="200px"
            h="auto"
            py={1.5}
            px={2}
            opacity={isActive ? 1 : 0.5}
          >
            <Flex align="center" justify="space-between" w="100%" gap={2}>
              <Flex align="center" gap={2}>
                <Box
                  w="10px"
                  h="10px"
                  borderRadius="full"
                  bg={playerColor}
                  border="1px solid"
                  borderColor="brand.borderWarm"
                  flexShrink={0}
                />
                <Text
                  fontSize="xs"
                  fontWeight={isActive ? 'bold' : 'medium'}
                  flexShrink={0}
                  maxW="100px"
                  truncate
                  color={isDark ? 'brand.parchment' : 'brand.inkDark'}
                >
                  {name}
                </Text>
              </Flex>
              <Box
                bg="brand.stoneLight"
                border="1px solid"
                borderColor="brand.borderWarm"
                borderRadius="sm"
                px={1.5}
                py={0.5}
                flexShrink={0}
              >
                <Text
                  fontSize="xs"
                  fontWeight="bold"
                  color="brand.inkDark"
                >
                  {avgApm}
                </Text>
              </Box>
            </Flex>
          </Button>
        );
      })}
    </Flex>
  );
}
