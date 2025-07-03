import type { Player } from '../types/match';

export function groupPlayersIntoTeams(players: Player[]): Player[][] {
  const allSameTeam = players.length > 0 && players.every(p => p.number === players[0].number);

  // Group players by team
  const teams: Player[][] = players.reduce((acc: Player[][], player) => {
    // player.number is 1-based, so subtract 1 for a 0-based index.
    const key = allSameTeam ? player.color_id : (player.number + 1);

    const teamIndex = key;
    if (teamIndex >= 0) {
      if (!acc[teamIndex]) {
        acc[teamIndex] = [];
      }
      acc[teamIndex].push(player);
    }
    return acc;
  }, []);

  // Filter out empty teams that can result from non-sequential team numbers
  const filteredTeams = teams.filter(team => team && team.length > 0);
  
  // Sort players within each team by color_id (ascending)
  return filteredTeams.map(team => 
    team.sort((a, b) => (a.color_id || 0) - (b.color_id || 0))
  );
}

export function detectWinningTeams(teams: Player[][]): { winningTeam?: number; winningTeams: number[] } {
  // Derive the winning teams from the teams array.
  const winningTeams = teams
    .map((team, index) => {
      // A team is a winner if any player in it is a winner.
      // The new team number is the sequential, 1-based index of the teams array.
      return team.some(player => player.winner) ? index + 1 : null;
    })
    .filter((teamNumber): teamNumber is number => teamNumber !== null);

  const winningTeam = winningTeams.length > 0 ? winningTeams[0] : undefined;

  return { winningTeam, winningTeams };
} 