import { Box, VStack, Text, HStack, Accordion, Card, Icon, useBreakpointValue, Button, Spinner } from '@chakra-ui/react';
import { system } from '../../theme/theme';
import { cardVariant } from '../../types/chakra-overrides';
import type { Match, MatchGroup } from '../../types/match';
import { FiClock } from 'react-icons/fi';
import { GiBroadsword } from 'react-icons/gi';
import { useLayoutConfig } from '../../theme/breakpoints';
import { sumDurations, countByDiplomacy, formatSessionTimingData } from '../../utils/matchUtils';
import { shortenMatchTypeName } from '../../utils/gameUtils';
import { MatchCard } from './MatchCard';

// Convert number to Roman numerals (handles up to ~20)
function toRoman(num: number): string {
  const vals = [10, 9, 5, 4, 1];
  const syms = ['X', 'IX', 'V', 'IV', 'I'];
  let result = '';
  for (let i = 0; i < vals.length; i++) {
    while (num >= vals[i]) {
      result += syms[i];
      num -= vals[i];
    }
  }
  return result;
}

interface MatchListProps {
  matchGroups: MatchGroup[];
  openDates: string[];
  onOpenDatesChange: (dates: string[]) => void;
  profileId: string;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
}

export function MatchList({ matchGroups, openDates, onOpenDatesChange, profileId, hasMore, isLoadingMore, onLoadMore }: MatchListProps) {
  const layout = useLayoutConfig();
  const token = (path: string) => system.token(path, '');
  const isFlatMode = matchGroups.length === 1 && matchGroups[0].date === 'flat';
  const isMobile = useBreakpointValue({ base: true, md: false });

  // Render matches for a group
  const renderMatches = (matches: Match[], groupOpen: boolean) => (
    <VStack gap={layout?.matchList.groupGap} align="stretch" width="100%" mx="auto">
      {matches.map((match) => (
        <Box
          key={match.match_id}
          minH={layout?.matchList.groupMinHeight}
          width={layout?.matchList.matchWidth}
          mx="auto"
          display="flex"
          flexDirection="column"
        >
          <MatchCard match={match} profileId={profileId} groupOpen={groupOpen} />
        </Box>
      ))}
    </VStack>
  );

  return (
    <Box w={layout?.matchList.width} maxWidth={layout?.matchList.maxWidth} overflow={layout?.matchList.overflow}>
      <Accordion.Root
          multiple
          value={isFlatMode ? ['flat'] : openDates}
          onValueChange={({ value }: { value: string[] }) => !isFlatMode && onOpenDatesChange(value)}
          w={layout?.matchList.accordionWidth}
          mx="auto"
          variant="enclosed"
        >
          {matchGroups.map((group: MatchGroup) => {
            const { totalReal } = sumDurations(group.matches);
            const byDiplo = countByDiplomacy(group.matches, profileId);
            const isOpen = isFlatMode || openDates.includes(group.date);
            const totalWins = Object.values(byDiplo).reduce((sum, rec) => sum + rec.wins, 0);
            return (
              <Accordion.Item
                key={group.date}
                borderBottom={isFlatMode ? 'none' : '2px solid'}
                borderBottomColor="brand.bronzeLight"
                position="relative"
                value={group.date}>
                {/* Margin annotation — desktop only, hidden in flat mode */}
                {!isFlatMode && (
                  <Box
                    display={{ base: 'none', md: 'block' }}
                    position="absolute"
                    left="-28px"
                    top="8px"
                    bottom="8px"
                    width="20px"
                    css={{
                      writingMode: 'vertical-rl',
                    }}
                    borderRight="1px solid"
                    borderRightColor="brand.inkLight"
                    pr="6px"
                    textAlign="center"
                  >
                    <Text
                      fontFamily="'Lora', serif"
                      fontStyle="italic"
                      fontSize="9px"
                      color="brand.inkMuted"
                      opacity={0.6}
                      whiteSpace="nowrap"
                    >
                      {toRoman(group.matches.length)} · {toRoman(totalWins)} victoria
                    </Text>
                  </Box>
                )}
                <h2 style={isFlatMode ? { display: 'none' } : undefined}>
                  <Accordion.ItemTrigger>
                    <VStack flex="1" align="stretch" gap={2}>
                      {/* Date Header */}
                      <Box bg="brand.sessionHeaderBg" p={1} borderBottom="2px solid" borderBottomColor="brand.bronze">
                        {(() => {
                          const timingData = formatSessionTimingData(group.date, totalReal);
                          return (
                            <>
                              {/* Mobile: Two-line layout */}
                              <VStack gap={1} display={{ base: "flex", md: "none" }} align="stretch">
                                {/* Line 1: Drop cap + Date and Time Range */}
                                <HStack gap={1} alignItems="flex-start">
                                  <Text fontSize="28px" color="brand.redChalk" fontWeight={700} lineHeight="0.85" fontFamily="'Lora', serif" mt="1px">
                                    {timingData.dateDisplay.charAt(0)}
                                  </Text>
                                  <VStack gap={0} align="flex-start">
                                    <Text fontWeight="bold" color="brand.inkDark" fontSize="sm">{timingData.dateDisplay.slice(1)}</Text>
                                    {timingData.timeRange && (
                                      <Text fontWeight="semibold" color="brand.inkDark" fontSize="xs">{timingData.timeRange}</Text>
                                    )}
                                  </VStack>
                                </HStack>

                                {/* Line 2: Session Duration and Time Played */}
                                <HStack gap={3} justify="flex-start" fontSize="xs">
                                  <HStack gap={1}>
                                    <Icon boxSize="10px" color="brand.bronze"><FiClock /></Icon>
                                    <Text color="brand.inkMuted">Session:</Text>
                                    <Text fontWeight="medium" color="brand.inkMuted">{timingData.sessionDuration}</Text>
                                  </HStack>
                                  <HStack gap={1}>
                                    <GiBroadsword size={10} color="currentColor" />
                                    <Text color="brand.inkMuted">Played:</Text>
                                    <Text fontWeight="medium" color="brand.inkMuted">{timingData.timePlayed}</Text>
                                  </HStack>
                                </HStack>
                              </VStack>
                              {/* Desktop: One line with better hierarchy */}
                              <HStack justify="space-between" align="center" display={{ base: "none", md: "flex" }}>
                                {/* Left: Drop cap + date/time info */}
                                <HStack gap={1} alignItems="flex-start">
                                  <Text fontSize="44px" color="brand.redChalk" fontWeight={700} lineHeight="0.85" fontFamily="'Lora', serif" mt="2px">
                                    {timingData.dateDisplay.charAt(0)}
                                  </Text>
                                  <VStack gap={0} align="flex-start">
                                    <Text fontWeight="bold" color="brand.inkDark" fontSize="md">{timingData.dateDisplay.slice(1)}</Text>
                                    {timingData.timeRange && (
                                      <Text fontWeight="semibold" color="brand.inkDark" fontSize="sm">{timingData.timeRange}</Text>
                                    )}
                                  </VStack>
                                </HStack>

                                {/* Right: Duration info with labels */}
                                <HStack gap={4} fontSize="sm">
                                  <HStack gap={1}>
                                    <Icon boxSize={3} color="brand.bronze"><FiClock /></Icon>
                                    <Text color="brand.inkMuted">Session:</Text>
                                    <Text fontWeight="medium" color="brand.inkMuted">{timingData.sessionDuration}</Text>
                                  </HStack>
                                  <HStack gap={1}>
                                    <GiBroadsword size={12} color="currentColor" />
                                    <Text color="brand.inkMuted">Played:</Text>
                                    <Text fontWeight="medium" color="brand.inkMuted">{timingData.timePlayed}</Text>
                                  </HStack>
                                </HStack>
                              </HStack>
                            </>
                          );
                        })()}
                      </Box>

                      {/* Match Stats Row */}
                      <HStack justify="space-between" align="center" role="group">
                        <Card.Root variant={cardVariant('matchesCountBubble')}>
                          <Text as="span">Matches: </Text>
                          <Text as="span">{group.matches.length}</Text>
                        </Card.Root>
                        <HStack gap={2} wrap="wrap" justify="flex-end">
                          {Object.entries(byDiplo).map(([diplo, rec]) => (
                            <Card.Root key={diplo} variant={cardVariant('recordBubble')}>
                              <Text as="span" fontWeight="bold" mr={2} display="inline-block" width={{ base: '60px', md: '120px' }} textAlign="center" verticalAlign="middle" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                                {isMobile ? shortenMatchTypeName(diplo) : diplo}
                              </Text>
                              <Text as="span" color="brand.inkMuted" mr={2} verticalAlign="middle">|</Text>
                              <Text as="span" color="brand.darkWin" mr={1} display="inline-block" minWidth={{ base: '22px', md: '28px' }} verticalAlign="middle" fontWeight="bold">{rec.wins}W</Text>
                              <Text as="span" color="brand.darkLoss" display="inline-block" minWidth={{ base: '22px', md: '28px' }} verticalAlign="middle" fontWeight="bold">{rec.losses}L</Text>
                              {rec.uncategorized > 0 && (
                                <Text as="span" color="brand.inkMuted" ml={1} verticalAlign="middle">{rec.uncategorized}?</Text>
                              )}
                              {rec.eloChange !== 0 && (
                                <>
                                  <Text as="span" color="brand.inkMuted" ml={2} mr={2} verticalAlign="middle">|</Text>
                                  <Text
                                    as="span"
                                    display="inline-block"
                                    minWidth={{ base: '30px', md: '35px' }}
                                    textAlign="right"
                                    fontFamily="mono"
                                    color={rec.eloChange > 0 ? 'brand.darkWin' : 'brand.darkLoss'}
                                    verticalAlign="middle"
                                  >
                                    {rec.eloChange > 0 ? `+${rec.eloChange}` : rec.eloChange}
                                  </Text>
                                </>
                              )}
                            </Card.Root>
                          ))}
                        </HStack>
                      </HStack>
                    </VStack>
                    <Box
                      w="24px"
                      h="24px"
                      bg={token('colors.brand.stampBg')}
                      borderRadius="full"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      color={token('colors.brand.stampText')}
                      fontSize="lg"
                      fontWeight="bold"
                      border="2px solid"
                      borderColor={token('colors.brand.stampBorder')}
                      boxShadow={token('colors.brand.stampShadow')}
                      transition="all 0.2s ease"
                      position="relative"
                      right="-8px"
                      _hover={{
                        bg: token('colors.brand.stampBgHover'),
                        color: token('colors.brand.stampText'),
                        boxShadow: token('colors.brand.stampShadowHover')
                      }}
                    >
                      <Text
                        fontSize="lg"
                        fontWeight="bold"
                        color={token('colors.brand.stampText')}
                        textShadow={token('colors.brand.stampTextShadow')}
                        lineHeight="1"
                      >
                        {isOpen ? "−" : "+"}
                      </Text>
                    </Box>
                  </Accordion.ItemTrigger>
                </h2>
                <Accordion.ItemContent pb={4}><Accordion.ItemBody>
                    {renderMatches(group.matches, isOpen)}
                  </Accordion.ItemBody></Accordion.ItemContent>
              </Accordion.Item>
            );
          })}
      </Accordion.Root>
      {hasMore && onLoadMore && (
        <Box textAlign="center" py={6}>
          <Button
            onClick={onLoadMore}
            disabled={isLoadingMore}
            variant="outline"
            size="lg"
            borderColor="brand.bronze"
            color="brand.inkDark"
            bg="brand.parchmentSurface"
            _hover={{ bg: 'brand.parchmentHover', borderColor: 'brand.bronzeDark' }}
            fontFamily="'Lora', serif"
            data-testid="load-more-button"
          >
            {isLoadingMore ? (
              <HStack gap={2}>
                <Spinner size="sm" color="brand.bronze" />
                <Text>Loading...</Text>
              </HStack>
            ) : (
              'Load More Matches'
            )}
          </Button>
        </Box>
      )}
    </Box>
  );
}
