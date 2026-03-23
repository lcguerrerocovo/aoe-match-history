import { Box, VStack, HStack, Text } from '@chakra-ui/react';
import type { Match } from '../../types/match';
import { formatDateTime } from '../../utils/matchUtils';
import { formatDuration, parseDuration } from '../../utils/timeUtils';

export function MatchDetails({ match }: { match: Match }) {
  const durationSec = parseDuration(match.duration);
  const gameTimeSec = Math.round(durationSec * 1.7);

  return (
    <Box
      w="100%"
      p={4}
      pb={4}
      bg="transparent"
      borderBottom="1px solid"
      borderBottomColor="brand.inkMedium"
      data-testid="match-details"
    >
      <VStack gap={3} align="stretch">
        {/* Inscription Title */}
        <VStack gap={1} align="center">
          <Text
            fontSize={{ base: "xl", md: "2xl" }}
            color="brand.inkDark"
            letterSpacing="0.05em"
            textAlign="center"
          >
            {match.description}
          </Text>
          <Text
            fontSize="xs"
            fontStyle="italic"
            color="brand.inkMuted"
            textAlign="center"
          >
            Match #{match.match_id}
          </Text>
        </VStack>

        {/* Diamond Ornament */}
        <Box display="flex" justifyContent="center">
          <Box
            w="5px"
            h="5px"
            bg="brand.redChalk"
            transform="rotate(45deg)"
          />
        </Box>

        {/* Details Grid */}
        <HStack
          justify="space-between"
          gap={{ base: 2, md: 6 }}
          wrap={{ base: "wrap", md: "nowrap" }}
          data-testid="details-row"
        >
          {/* Date & Time */}
          <VStack align="start" gap={1} flex={{ base: "1", md: "auto" }} minW={{ base: "100px", md: "auto" }}>
            <Text fontSize="xs" fontStyle="italic" color="brand.inkMuted">
              <Box as="span" display={{ base: "inline", md: "none" }}>Date</Box>
              <Box as="span" display={{ base: "none", md: "inline" }}>Date & Time</Box>
            </Text>
            <Text color="brand.inkDark" fontSize={{ base: "xs", md: "md" }} fontWeight="medium" data-testid="match-detail-value">
              {formatDateTime(match.start_time)}
            </Text>
          </VStack>

          {/* Game Duration */}
          <VStack align="start" gap={1} flex={{ base: "1", md: "auto" }} minW={{ base: "80px", md: "auto" }}>
            <Text fontSize="xs" fontStyle="italic" color="brand.inkMuted">
              <Box as="span" display={{ base: "inline", md: "none" }}>Game</Box>
              <Box as="span" display={{ base: "none", md: "inline" }}>Game Duration</Box>
            </Text>
            <Text color="brand.inkDark" fontSize={{ base: "xs", md: "md" }} fontWeight="medium" data-testid="match-detail-value">
              {formatDuration(gameTimeSec)}
            </Text>
          </VStack>

          {/* Real Time */}
          <VStack align="start" gap={1} flex={{ base: "1", md: "auto" }} minW={{ base: "80px", md: "auto" }}>
            <Text fontSize="xs" fontStyle="italic" color="brand.inkMuted">
              <Box as="span" display={{ base: "inline", md: "none" }}>Real</Box>
              <Box as="span" display={{ base: "none", md: "inline" }}>Real Time</Box>
            </Text>
            <Text color="brand.inkDark" fontSize={{ base: "xs", md: "md" }} fontWeight="medium" data-testid="match-detail-value">
              {formatDuration(durationSec)}
            </Text>
          </VStack>
        </HStack>
      </VStack>
    </Box>
  );
}
