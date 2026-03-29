import { useMemo } from 'react';
import { Box, VStack, Text, HStack, Accordion, useBreakpointValue, Button, Spinner } from '@chakra-ui/react';
import { system } from '../../theme/theme';
import type { Match, MatchGroup } from '../../types/match';
import { useLayoutConfig } from '../../theme/breakpoints';
import { sumDurations, countByDiplomacy, formatSessionTimingData } from '../../utils/matchUtils';
import { shortenMatchTypeName } from '../../utils/gameUtils';
import { MatchCard } from './MatchCard';
import { useBatchAnalysis } from '../../hooks/useBatchAnalysis';

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

  const allMatchIds = useMemo(
    () => matchGroups.flatMap(g => g.matches.map(m => m.match_id)),
    [matchGroups]
  );

  const { analyzedIds, newlyAnalyzed, isProcessing, clearNewlyAnalyzed } = useBatchAnalysis({
    profileId,
    matchIds: allMatchIds,
  });

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
          <MatchCard
            match={match}
            profileId={profileId}
            groupOpen={groupOpen}
            analysisState={
              newlyAnalyzed.has(match.match_id) ? 'new'
              : analyzedIds.has(match.match_id) ? 'ready'
              : isProcessing ? 'processing'
              : 'none'
            }
            onAnalysisAnimationEnd={() => clearNewlyAnalyzed(match.match_id)}
          />
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
                borderBottom={isFlatMode ? 'none' : '1px solid'}
                borderBottomColor="brand.inkLight"
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
                    {(() => {
                      const timingData = formatSessionTimingData(group.date, totalReal, group.matches.length);
                      const diploEntries = Object.entries(byDiplo);
                      const hasUncategorized = diploEntries.some(([, rec]) => rec.uncategorized > 0);

                      const recordGrid = (
                        <Box
                          borderLeft="2px dotted"
                          borderLeftColor="brand.inkLight"
                          pl={{ base: 2, md: 3 }}
                          ml={{ base: 0, md: '48px' }}
                        >
                          {/* Session annotation: match count · duration (~gap between games) */}
                          <Text
                            fontFamily="'Lora', serif"
                            fontStyle="italic"
                            fontSize={{ base: '10px', md: '11px' }}
                            color="brand.inkMuted"
                            mb={1}
                          >
                            <Text as="span" fontSize={{ base: '12px', md: '13px' }} fontStyle="normal" fontWeight={700}>{toRoman(group.matches.length)}</Text> matches played · {timingData.sessionDuration}
                            {timingData.avgGapMinutes >= 2 && group.matches.length > 1 && ` (~${timingData.avgGapMinutes}m between games)`}
                          </Text>

                          {/* Record grid */}
                          <Box
                            display="grid"
                            css={{
                              gridTemplateColumns: isMobile
                                ? `72px 30px 30px ${hasUncategorized ? '26px ' : ''}44px`
                                : `120px 36px 36px ${hasUncategorized ? '30px ' : ''}50px`,
                              gap: '2px 0',
                            }}
                            alignItems="baseline"
                            fontSize={{ base: '11px', md: '12px' }}
                          >
                            {diploEntries.map(([diplo, rec]) => (
                              <Box key={diplo} display="contents">
                                <Text
                                  css={{ fontVariantCaps: 'small-caps' }}
                                  fontWeight={700}
                                  fontSize="11px"
                                  letterSpacing="0.04em"
                                  color="brand.inkDark"
                                  overflow="hidden"
                                  textOverflow="ellipsis"
                                  whiteSpace="nowrap"
                                >
                                  {isMobile ? shortenMatchTypeName(diplo) : diplo}
                                </Text>
                                <Text textAlign="right" color={rec.wins === 0 ? 'brand.inkMuted' : 'brand.darkWin'} fontWeight="bold" display="flex" alignItems="baseline" justifyContent="flex-end">
                                  {rec.wins === 0 ? '—' : <>{rec.wins}<Text as="span" fontSize="0.85em" fontWeight={700}>W</Text></>}
                                </Text>
                                <Text textAlign="right" color={rec.losses === 0 ? 'brand.inkMuted' : 'brand.darkLoss'} fontWeight="bold" display="flex" alignItems="baseline" justifyContent="flex-end">
                                  {rec.losses === 0 ? '—' : <>{rec.losses}<Text as="span" fontSize="0.85em" fontWeight={700}>L</Text></>}
                                </Text>
                                {hasUncategorized && (
                                  <Text textAlign="right" color="brand.inkMuted" fontWeight="bold">
                                    {rec.uncategorized > 0 ? `${rec.uncategorized}?` : ''}
                                  </Text>
                                )}
                                <Text
                                  textAlign="right"
                                  fontFamily="mono"
                                  color={rec.eloChange > 0 ? 'brand.darkWin' : rec.eloChange < 0 ? 'brand.darkLoss' : 'brand.inkMuted'}
                                >
                                  {rec.eloChange > 0 ? `+${rec.eloChange}` : rec.eloChange !== 0 ? rec.eloChange : '—'}
                                </Text>
                              </Box>
                            ))}
                          </Box>
                        </Box>
                      );

                      const moonColor = system.token('colors.brand.redChalk', '#8B3A3A');

                      return (
                        <>
                          <VStack flex="1" align="stretch" gap={2}>
                            {/* Date Header */}
                            <Box bg="brand.sessionHeaderBg" p={1} borderBottom="2px solid" borderBottomColor="brand.bronze">
                              {/* Mobile */}
                              <HStack gap={1} alignItems="baseline" display={{ base: "flex", md: "none" }}>
                                <Text fontSize="28px" color="brand.redChalk" fontWeight={700} lineHeight="0.85" fontFamily="'Lora', serif">
                                  {timingData.dateDisplay.charAt(0)}
                                </Text>
                                <Text fontWeight="bold" color="brand.inkDark" fontSize="sm" fontFamily="'Lora', serif">{timingData.dateDisplay.slice(1)}</Text>
                                {timingData.isCrossDay && (
                                  <svg width="14" height="14" viewBox="0 0 24 24" style={{ opacity: 0.45, flexShrink: 0 }}>
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-1.1 0-2.15-.22-3.1-.62A8.996 8.996 0 0 0 15 12a8.996 8.996 0 0 0-6.1-7.38c.95-.4 2-.62 3.1-.62 4.42 0 8 3.58 8 8s-3.58 8-8 8z" fill={moonColor} />
                                  </svg>
                                )}
                                {timingData.timeRange && (
                                  <>
                                    <Text color="brand.inkMuted" fontSize="xs">·</Text>
                                    <Text fontStyle="italic" color="brand.inkMuted" fontSize="xs" fontFamily="'Lora', serif">{timingData.timeRange}</Text>
                                  </>
                                )}
                              </HStack>

                              {/* Desktop */}
                              <HStack gap={1} alignItems="baseline" display={{ base: "none", md: "flex" }}>
                                <Text fontSize="44px" color="brand.redChalk" fontWeight={700} lineHeight="0.85" fontFamily="'Lora', serif">
                                  {timingData.dateDisplay.charAt(0)}
                                </Text>
                                <Text fontWeight="bold" color="brand.inkDark" fontSize="md" fontFamily="'Lora', serif">{timingData.dateDisplay.slice(1)}</Text>
                                {timingData.isCrossDay && (
                                  <svg width="18" height="18" viewBox="0 0 24 24" style={{ opacity: 0.45, flexShrink: 0 }}>
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-1.1 0-2.15-.22-3.1-.62A8.996 8.996 0 0 0 15 12a8.996 8.996 0 0 0-6.1-7.38c.95-.4 2-.62 3.1-.62 4.42 0 8 3.58 8 8s-3.58 8-8 8z" fill={moonColor} />
                                  </svg>
                                )}
                                {timingData.timeRange && (
                                  <>
                                    <Text color="brand.inkMuted" fontSize="sm">·</Text>
                                    <Text fontStyle="italic" color="brand.inkMuted" fontSize="13px" fontFamily="'Lora', serif">{timingData.timeRange}</Text>
                                  </>
                                )}
                              </HStack>
                            </Box>

                            {/* Record grid — same layout for mobile and desktop */}
                            {recordGrid}
                          </VStack>

                          {/* Seal toggle */}
                          <Box
                            w="28px"
                            h="28px"
                            bg={token('colors.brand.stampBg')}
                            borderRadius="full"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            border="2px solid"
                            borderColor={token('colors.brand.stampBorder')}
                            boxShadow={token('colors.brand.stampShadow')}
                            transition="all 0.2s ease"
                            position="relative"
                            right="-8px"
                            _hover={{
                              bg: token('colors.brand.stampBgHover'),
                              boxShadow: token('colors.brand.stampShadowHover')
                            }}
                            _after={{
                              content: '""',
                              position: 'absolute',
                              inset: '3px',
                              borderRadius: 'full',
                              border: '1px solid',
                              borderColor: token('colors.brand.stampRing'),
                              pointerEvents: 'none',
                            }}
                          >
                            <Text
                              fontSize="md"
                              fontWeight="bold"
                              color={token('colors.brand.stampText')}
                              textShadow={token('colors.brand.stampTextShadow')}
                              lineHeight="1"
                            >
                              {isOpen ? "−" : "+"}
                            </Text>
                          </Box>
                        </>
                      );
                    })()}
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
            _hover={{ bg: 'brand.parchmentDark', borderColor: 'brand.bronzeDark' }}
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
