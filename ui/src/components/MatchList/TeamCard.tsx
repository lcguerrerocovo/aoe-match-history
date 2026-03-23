import { Box, VStack, Text, Link, Card } from '@chakra-ui/react';
import { cardVariant } from '../../types/chakra-overrides';
import { Link as RouterLink } from 'react-router-dom';
import type { Match, Player } from '../../types/match';
import { PLAYER_COLORS } from '../../utils/playerColors';
import { useLayoutConfig } from '../../theme/breakpoints';
import { assetManager } from '../../utils/assetManager';
import { PlayerRating } from './PlayerRating';

export function TeamCard({ match }: { match: Match }) {
  const layout = useLayoutConfig();
  const is1v1 = match.diplomacy?.type === '1v1';

  const getPlayerCardPadding = (numPlayers: number) => {
    if (numPlayers <= 1) return 2; // 1v1 gets most padding
    if (numPlayers === 2) return 1.5;
    if (numPlayers === 3) return 1;
    return 0.5; // 4+ players get least padding
  };

  // Helper function to chunk teams into rows based on layout config
  const chunkTeamsIntoRows = (teams: Player[][]) => {
    if (!layout?.teamCard.wrapTeams || !layout?.teamCard.teamsPerRow) {
      return [teams]; // Return single row if wrapping is disabled
    }

    const rows = [];
    for (let i = 0; i < teams.length; i += layout.teamCard.teamsPerRow) {
      rows.push(teams.slice(i, i + layout.teamCard.teamsPerRow));
    }
    return rows;
  };

  const teamRows = Array.isArray(match.teams) ? chunkTeamsIntoRows(match.teams) : [];

  const renderTeam = (team: Player[], globalTeamIndex: number) => {
    const isWinner = match.winning_teams?.includes(globalTeamIndex + 1) || match.winning_team === globalTeamIndex + 1;
    const cardPadding = getPlayerCardPadding(team.length);

    // Calculate the starting index for this team
    let teamStartIndex = 0;
    for (let i = 0; i < globalTeamIndex; i++) {
      teamStartIndex += match.teams[i].length;
    }

    return (
      <Card.Root
        key={globalTeamIndex}
        data-testid="team-card"
        variant={cardVariant(isWinner ? 'winner' : 'loser')}
        flex="1"
        minW="0"
        maxW={layout?.teamCard.teamMaxWidth}
        position="relative"
      >
        <VStack
          gap={layout?.teamCard.teamVStackSpacing}
          align={layout?.teamCard.teamVStackAlign}
          width={layout?.teamCard.teamVStackWidth}
        >
          {Array.isArray(team) && team.map((p: Player, playerIndex: number) => {
            const globalPlayerIndex = teamStartIndex + playerIndex;
            return (
              <Box
                key={p.user_id}
                display="flex"
                alignItems="center"
                borderWidth="1px"
                borderColor="brand.stone"
                p={cardPadding}
                bg={globalPlayerIndex % 2 === 0 ? 'brand.cardBg' : 'brand.stoneLight'}
                minW={layout?.teamCard.playerBoxMinWidth}
                maxW={layout?.teamCard.playerBoxMaxWidth}
                flex={layout?.teamCard.playerBoxFlex}
                m={0}
              >
                <Box
                  w={layout?.teamCard.colorBarWidth}
                  h={layout?.teamCard.colorBarHeight}
                  bg={PLAYER_COLORS[p.color_id] || 'brand.inkMuted'}
                  mr={1}
                  flexShrink={0}
                />
                <Box
                  position="relative"
                  w={layout?.teamCard.civIconSize}
                  h={layout?.teamCard.civIconSize}
                  mr={1}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  flexShrink={0}
                  overflow="hidden"
                >
                  <img
                    src={assetManager.getCivIcon(String(p.civ || 'unknown'))}
                    alt={String(p.civ || 'Unknown')}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      borderRadius: '0'
                    }}
                    onError={(e) => {
                      // Fallback to text if image fails to load
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const textElement = target.parentElement?.querySelector('.civ-fallback') as HTMLElement;
                      if (textElement) {
                        textElement.style.display = 'block';
                      }
                    }}
                  />
                  <Text
                    className="civ-fallback"
                    position="absolute"
                    top={0}
                    left="50%"
                    transform="translateX(-50%)"
                    fontSize={layout?.teamCard.civFontSize}
                    fontWeight="bold"
                    color="brand.bronze"
                    zIndex={1}
                    display="none"
                    bg="brand.stoneLight"
                    px={1}
                  >
                    {(typeof p.civ === 'string' ? p.civ : '???').slice(0, 3).toUpperCase()}
                  </Text>
                </Box>
                <Link
                  color="brand.inkDark"
                  fontWeight="semibold"
                  _hover={{ color: "brand.inkAccent", textDecoration: "underline" }}
                  textDecoration="none"
                  fontSize={layout?.teamCard.playerNameFontSize}
                  textOverflow="ellipsis"
                  overflow="hidden"
                  whiteSpace="nowrap"
                  maxWidth={is1v1 ? layout?.teamCard.playerNameMaxWidth1v1 : layout?.teamCard.playerNameMaxWidthTeam}
                  display="inline-block"
                  cursor="pointer"
                  asChild><RouterLink to={`/profile_id/${p.user_id.toString()}`}>
                    {p.name}
                  </RouterLink></Link>
                <PlayerRating player={p} />
              </Box>
            );
          })}
        </VStack>
      </Card.Root>
    );
  };

  return (
    <Box width={layout?.teamCard.width}>
      <Box
        display="flex"
        flexDirection={layout?.teamCard.wrapTeams ? 'column' : layout?.teamCard.flexDirection}
        gap={layout?.teamCard.gap}
        width="100%"
        justifyContent="center"
      >
        {layout?.teamCard.wrapTeams ? (
          // Wrapped layout: teams in rows
          (teamRows.map((row, rowIndex) => (
            <Box
              key={rowIndex}
              data-testid="team-row"
              display="flex"
              flexDirection="row"
              gap={layout?.teamCard.gap}
              width="100%"
              justifyContent="center"
            >
              {row.map((team: Player[], teamIndex: number) => {
                const globalTeamIndex = rowIndex * (layout?.teamCard.teamsPerRow || 2) + teamIndex;
                return renderTeam(team, globalTeamIndex);
              })}
            </Box>
          )))
        ) : (
          // Sequential layout: all teams in one row/column
          (Array.isArray(match.teams) && match.teams.map((team: Player[], idx: number) => renderTeam(team, idx)))
        )}
      </Box>
    </Box>
  );
}
