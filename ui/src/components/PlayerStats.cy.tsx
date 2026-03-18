/// <reference types="cypress" />
import { mount } from '@cypress/react';
import { PlayerStats } from './PlayerStats';
import { type PersonalStats, type LeaderboardStats } from '../types/stats';
import { CustomThemeProvider } from '../theme/ThemeProvider';

const createMockStats = (leaderboardStats: LeaderboardStats[]): PersonalStats => ({
  result: { code: 200, message: 'OK' },
  statGroups: [
    {
      id: 1,
      name: 'Test Group',
      type: 1,
      members: [{ profile_id: 123, name: 'Test Player', alias: 'TestPlayer', personal_statgroup_id: 1, xp: 100, level: 1, leaderboardregion_id: 1, country: 'US', clanlist_name: 'TEST' }],
    },
  ],
  leaderboardStats,
});

const createMockLeaderboardStat = (rating: number, rank: number): LeaderboardStats => ({
  leaderboard_id: 3,
  rating,
  rank,
  ranktotal: 10000,
  wins: 1,
  losses: 0,
  streak: 1,
  highestrating: 1700,
  rank_change: 0,
  statgroup_id: 1,
  ranklevel: 1,
  regionrank: 1,
  regionranktotal: 1,
  lastmatchdate: 1,
  highestrank: 1,
  highestranklevel: 1,
  disputes: 0,
  drops: 0,
  total_players: 1,
  rank_country: 1,
});

describe('<PlayerStats /> Performance Stats', () => {
  it('should render rating and performance data correctly', () => {
    const stats = createMockStats([createMockLeaderboardStat(1700, 100)]);
    mount(
      <CustomThemeProvider>
        <PlayerStats stats={stats} />
      </CustomThemeProvider>
    );
    
    // Check that the combined table structure is present
    cy.contains('Board').should('exist');
    cy.contains('Rating').should('exist');
    cy.contains('Max').should('exist');
    cy.contains('Diff').should('exist');
    cy.contains('Games').should('exist');
    cy.contains('Won').should('exist');
    cy.contains('Streak').should('exist');
    
    // Check that the data is displayed
    cy.contains('1700').should('exist'); // Rating
    cy.contains('1700').should('exist'); // Max rating
    cy.contains('1').should('exist'); // Games (wins + losses)
    cy.contains('100.00%').should('exist'); // Win rate
    cy.contains('+1').should('exist'); // Streak
  });

  it('should handle multiple leaderboards', () => {
    const stats = createMockStats([
      createMockLeaderboardStat(1700, 100),
      createMockLeaderboardStat(1400, 500)
    ]);
    mount(
      <CustomThemeProvider>
        <PlayerStats stats={stats} />
      </CustomThemeProvider>
    );
    
    // Should show both leaderboards
    cy.contains('1700').should('exist');
    cy.contains('1400').should('exist');
  });

  it('should not show tier-specific styling (moved to RankingCard)', () => {
    const stats = createMockStats([createMockLeaderboardStat(1700, 100)]);
    mount(
      <CustomThemeProvider>
        <PlayerStats stats={stats} />
      </CustomThemeProvider>
    );
    
    // Should not have tier crowns (moved to RankingCard)
    cy.get('[data-testid="tier-crown"]').should('not.exist');
  });
});