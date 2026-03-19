import { Box, VStack, HStack, Text, Link, Card, Separator, Icon } from '@chakra-ui/react';
import { cardVariant } from '../../types/chakra-overrides';
import { Tooltip } from '../ui/tooltip';
import { Link as RouterLink } from 'react-router-dom';
import { FiCalendar, FiClock } from 'react-icons/fi';
import { useLayoutConfig } from '../../theme/breakpoints';
import { parseDuration } from '../../utils/timeUtils';
import { formatDuration, formatDateTime } from '../../utils/matchUtils';
import type { Match } from '../../types/match';
import { APMButton } from './APMButton';

export function MatchSummaryCard({ match, profileId, groupOpen }: { match: Match; profileId: string; groupOpen: boolean }) {
  const layout = useLayoutConfig();
  const durationSec = parseDuration(match.duration);
  const gameTimeSec = Math.round(durationSec * 1.7);

  return (
    <Card.Root variant={cardVariant('summary')} w="100%" mb={1} p={1} fontSize={{ base: 'xs', md: 'sm' }}>
      <VStack gap={0.5} align="stretch">
        <HStack justify="space-between" gap={2} wrap="wrap" align="center" minH="32px" py={1}>
          <Link
            fontWeight="bold"
            color="brand.inkDark"
            _hover={{ color: "brand.inkAccent", textDecoration: "underline" }}
            textDecoration="none"
            asChild><RouterLink to={`/match/${match.match_id}`}>#{match.match_id}
            </RouterLink></Link>
          <Link
            color="brand.linkDefault"
            fontWeight="semibold"
            _hover={{ color: "brand.linkHover", textDecoration: "underline" }}
            asChild><RouterLink to={`/match/${match.match_id}`}>
              {match.description}
            </RouterLink></Link>
          {/* APM button */}
          {profileId && (
            <Box display="flex" alignItems="center" justifyContent="flex-end">
              <APMButton matchId={match.match_id} profileId={profileId} groupOpen={groupOpen} />
            </Box>
          )}
        </HStack>
        <Separator />
        <Box
          display="flex"
          flexDirection={layout?.matchSummaryCard.flexDirection}
          gap={layout?.matchSummaryCard.gap}
          alignItems={layout?.matchSummaryCard.alignItems}
          justifyContent={layout?.matchSummaryCard.justifyContent}
          w={layout?.matchSummaryCard.w}
        >
          <HStack gap={1}>
            <Icon boxSize={3} color="brand.bronze"><FiCalendar /></Icon>
            <Text as="span" color="brand.inkMuted">
              {formatDateTime(match.start_time)}
            </Text>
          </HStack>
          <HStack gap={2}>
            <HStack gap={1}>
              <Icon boxSize={3} color="brand.inkAccent"><FiClock /></Icon>
              <Tooltip content="Game time (1.7x Real time)" fontSize="xs">
              <Text as="span" color="brand.inkMuted">
                {formatDuration(gameTimeSec)}
              </Text>
              </Tooltip>
            </HStack>
            <HStack gap={1}>
              <Icon boxSize={3} color="brand.bronze"><FiClock /></Icon>
                <Text as="span" color="brand.inkMuted">
                  {formatDuration(durationSec)}
                </Text>
            </HStack>
          </HStack>
        </Box>
      </VStack>
    </Card.Root>
  );
}
