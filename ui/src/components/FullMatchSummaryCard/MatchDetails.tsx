import { Box, VStack, HStack, Text, Separator, Icon } from '@chakra-ui/react';
import { FiCalendar, FiClock } from 'react-icons/fi';
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
      bg="brand.sessionHeaderBg"
      borderRadius="md"
      border="1px solid"
      borderColor="brand.bronze"
      boxShadow="inset 0 1px 2px rgba(0,0,0,0.1)"
      data-testid="match-details"
    >
      <VStack gap={3} align="stretch">
        {/* Title Row */}
        <HStack justify="space-between" align="center" wrap="wrap">
          <Text fontWeight="bold" color="brand.midnightBlue" fontSize="2xl">
            Match #{match.match_id}
          </Text>
          <Text color="brand.steel" fontSize="xl" fontWeight="semibold">
            {match.description}
          </Text>
        </HStack>

        <Separator borderColor="brand.steel" />

        {/* Details Grid */}
        <HStack
          justify="space-between"
          gap={{ base: 2, md: 6 }}
          wrap={{ base: "wrap", md: "nowrap" }}
          data-testid="details-row"
        >
          {/* Date & Time */}
          <VStack align="start" gap={1} flex={{ base: "1", md: "auto" }} minW={{ base: "100px", md: "auto" }}>
            <HStack gap={2}>
              <Icon boxSize={4} color="brand.bronze"><FiCalendar /></Icon>
              <Text fontSize="sm" color="brand.steel" fontWeight="semibold">
                <Box as="span" display={{ base: "inline", md: "none" }}>Date</Box>
                <Box as="span" display={{ base: "none", md: "inline" }}>Date & Time</Box>
              </Text>
            </HStack>
            <Text color="brand.midnightBlue" fontSize={{ base: "xs", md: "md" }} fontWeight="medium" data-testid="match-detail-value">
              {formatDateTime(match.start_time)}
            </Text>
          </VStack>

          {/* Game Duration */}
          <VStack align="start" gap={1} flex={{ base: "1", md: "auto" }} minW={{ base: "80px", md: "auto" }}>
            <HStack gap={2}>
              <Icon boxSize={4} color="brand.zoolanderBlue"><FiClock /></Icon>
              <Text fontSize="sm" color="brand.steel" fontWeight="semibold">
                <Box as="span" display={{ base: "inline", md: "none" }}>Game</Box>
                <Box as="span" display={{ base: "none", md: "inline" }}>Game Duration</Box>
              </Text>
            </HStack>
            <Text color="brand.midnightBlue" fontSize={{ base: "xs", md: "md" }} fontWeight="medium" data-testid="match-detail-value">
              {formatDuration(gameTimeSec)}
            </Text>
          </VStack>

          {/* Real Time */}
          <VStack align="start" gap={1} flex={{ base: "1", md: "auto" }} minW={{ base: "80px", md: "auto" }}>
            <HStack gap={2}>
              <Icon boxSize={4} color="brand.bronze"><FiClock /></Icon>
              <Text fontSize="sm" color="brand.steel" fontWeight="semibold">
                <Box as="span" display={{ base: "inline", md: "none" }}>Real</Box>
                <Box as="span" display={{ base: "none", md: "inline" }}>Real Time</Box>
              </Text>
            </HStack>
            <Text color="brand.midnightBlue" fontSize={{ base: "xs", md: "md" }} fontWeight="medium" data-testid="match-detail-value">
              {formatDuration(durationSec)}
            </Text>
          </VStack>
        </HStack>
      </VStack>
    </Box>
  );
}
