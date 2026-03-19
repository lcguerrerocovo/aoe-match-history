import { Box, VStack, Text, HStack, Accordion, Card, Icon, useBreakpointValue } from '@chakra-ui/react';
import { system } from '../../theme/theme';
import { cardVariant } from '../../types/chakra-overrides';
import type { Match, MatchGroup } from '../../types/match';
import { FiCalendar, FiClock } from 'react-icons/fi';
import { GiBroadsword } from 'react-icons/gi';
import { useLayoutConfig } from '../../theme/breakpoints';
import { sumDurations, countByDiplomacy, formatSessionTimingData } from '../../utils/matchUtils';
import { shortenMatchTypeName } from '../../utils/gameUtils';
import { MatchCard } from './MatchCard';

interface MatchListProps {
  matchGroups: MatchGroup[];
  openDates: string[];
  onOpenDatesChange: (dates: string[]) => void;
  profileId: string;
}

export function MatchList({ matchGroups, openDates, onOpenDatesChange, profileId }: MatchListProps) {
  const layout = useLayoutConfig();
  const token = (path: string) => system.token(path, '');
  const isSearchMode = matchGroups.length === 1 && matchGroups[0].date === 'search';
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
      {isSearchMode ? (
        // Search mode: render matches with same background as accordion
        (<Box
          bg="brand.cardBg"
          borderRadius="sm"
          borderWidth="1px"
          borderColor="brand.heraldic"
          p={4}
        >
          {renderMatches(matchGroups[0].matches, true)}
        </Box>)
      ) : (
        // Normal mode: render with accordion
        (<Accordion.Root
          multiple
          value={openDates}
          onValueChange={({ value }: { value: string[] }) => onOpenDatesChange(value)}
          w={layout?.matchList.accordionWidth}
          mx="auto"
          variant="enclosed"
        >
          {matchGroups.map((group: MatchGroup, _idx: number) => {
            const { totalReal } = sumDurations(group.matches);
            const byDiplo = countByDiplomacy(group.matches, profileId);
            const isOpen = openDates.includes(group.date);
            return (
              <Accordion.Item
                key={group.date}
                bg="brand.sessionCardBg"
                borderWidth="1px"
                borderColor="brand.slateBorder"
                borderRadius="sm"
                mb={0.5}
                value={group.date}>
                <h2>
                  <Accordion.ItemTrigger>
                    <VStack flex="1" align="stretch" gap={2}>
                      {/* Date Header */}
                      <Box bg="brand.sessionHeaderBg" p={1} borderRadius="sm" borderWidth="1px" borderColor="brand.bronze">
                        {(() => {
                          const timingData = formatSessionTimingData(group.date, totalReal);
                          return (
                            <>
                              {/* Mobile: Two-line layout */}
                              <VStack gap={1} display={{ base: "flex", md: "none" }} align="stretch">
                                {/* Line 1: Date and Time Range */}
                                <HStack gap={2} justify="flex-start">
                                  <HStack gap={1}>
                                    <Icon boxSize={3} color="brand.bronze"><FiCalendar /></Icon>
                                    <Text fontWeight="bold" color="brand.midnightBlue" fontSize="sm">{timingData.dateDisplay}</Text>
                                  </HStack>
                                  <Text color="brand.steel" fontSize="xs">|</Text>
                                  {timingData.timeRange && (
                                    <Text fontWeight="semibold" color="brand.midnightBlue" fontSize="sm">{timingData.timeRange}</Text>
                                  )}
                                </HStack>

                                {/* Line 2: Session Duration and Time Played */}
                                <HStack gap={3} justify="flex-start" fontSize="xs">
                                  <HStack gap={1}>
                                    <Icon boxSize="10px" color="brand.bronze"><FiClock /></Icon>
                                    <Text color="brand.steel">Session:</Text>
                                    <Text fontWeight="medium" color="brand.steel">{timingData.sessionDuration}</Text>
                                  </HStack>
                                  <HStack gap={1}>
                                    <GiBroadsword size={10} color="currentColor" />
                                    <Text color="brand.steel">Played:</Text>
                                    <Text fontWeight="medium" color="brand.steel">{timingData.timePlayed}</Text>
                                  </HStack>
                                </HStack>
                              </VStack>
                              {/* Desktop: One line with better hierarchy */}
                              <HStack justify="space-between" align="center" display={{ base: "none", md: "flex" }}>
                                {/* Left: Date and Time Range as primary info */}
                                <HStack gap={3}>
                                  <HStack gap={1}>
                                    <Icon boxSize={3} color="brand.bronze"><FiCalendar /></Icon>
                                    <Text fontWeight="bold" color="brand.midnightBlue" fontSize="md">{timingData.dateDisplay}</Text>
                                  </HStack>
                                  <Text color="brand.steel" fontSize="sm">|</Text>
                                  {timingData.timeRange && (
                                    <Text fontWeight="semibold" color="brand.midnightBlue" fontSize="md">{timingData.timeRange}</Text>
                                  )}
                                </HStack>

                                {/* Right: Duration info with labels */}
                                <HStack gap={4} fontSize="sm">
                                  <HStack gap={1}>
                                    <Icon boxSize={3} color="brand.bronze"><FiClock /></Icon>
                                    <Text color="brand.steel">Session:</Text>
                                    <Text fontWeight="medium" color="brand.steel">{timingData.sessionDuration}</Text>
                                  </HStack>
                                  <HStack gap={1}>
                                    <GiBroadsword size={12} color="currentColor" />
                                    <Text color="brand.steel">Played:</Text>
                                    <Text fontWeight="medium" color="brand.steel">{timingData.timePlayed}</Text>
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
                              <Text as="span" color="brand.steel" mr={2} verticalAlign="middle">|</Text>
                              <Text as="span" color="brand.darkWin" mr={1} display="inline-block" minWidth={{ base: '22px', md: '28px' }} verticalAlign="middle" fontWeight="bold">{rec.wins}W</Text>
                              <Text as="span" color="brand.darkLoss" display="inline-block" minWidth={{ base: '22px', md: '28px' }} verticalAlign="middle" fontWeight="bold">{rec.losses}L</Text>
                              {rec.uncategorized > 0 && (
                                <Text as="span" color="brand.steel" ml={1} verticalAlign="middle">{rec.uncategorized}?</Text>
                              )}
                              {rec.eloChange !== 0 && (
                                <>
                                  <Text as="span" color="brand.steel" ml={2} mr={2} verticalAlign="middle">|</Text>
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
        </Accordion.Root>)
      )}
    </Box>
  );
}
