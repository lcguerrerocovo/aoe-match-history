import { HStack, Text, useBreakpointValue } from '@chakra-ui/react';
import type { Player } from '../../types/match';

export function PlayerRating({ player }: { player: Player }) {
  const { rating, rating_change: ratingChange } = player;
  const displayMode = useBreakpointValue({ base: 'compact', md: 'full' });

  if (rating == null || ratingChange == null) {
    return null;
  }

  const changeColor = ratingChange > 0 ? 'brand.win' : 'brand.loss';
  const changeText = ratingChange > 0 ? `+${ratingChange}` : ratingChange.toString();

  if (displayMode === 'full') {
    return (
      <HStack gap={2} ml="auto">
        <Text fontWeight="semibold" fontSize="xs" fontFamily="mono" minWidth="4ch" textAlign="right" color="brand.midnightBlue">
          {rating}
        </Text>
        <Text color={changeColor} fontWeight="semibold" fontSize="xs" fontFamily="mono" minWidth="3ch" textAlign="right">
          {changeText}
        </Text>
      </HStack>
    );
  }

  return (
    <HStack gap={1} ml="auto">
      <Text fontWeight="semibold" fontSize="xs" fontFamily="mono" minWidth="4ch" textAlign="right" color="brand.midnightBlue">
        {rating}
      </Text>
      <Text color={changeColor} fontWeight="semibold" fontSize="xs" fontFamily="mono">
        ({changeText})
      </Text>
    </HStack>
  );
}
