/// <reference types="cypress" />
import { mount } from '@cypress/react';
import { ChakraProvider } from '@chakra-ui/react';
import { PlayerStats } from './PlayerStats';
import { type PersonalStats, type LeaderboardStats } from '../types/stats';
import { createTheme } from '../theme/theme';

const lightTheme = createTheme(false); // Use light theme for tests

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

describe('<PlayerStats /> Tiers', () => {
  it('should render Gold tier correctly', () => {
    const stats = createMockStats([createMockLeaderboardStat(1700, 100)]);
    mount(
      <ChakraProvider theme={lightTheme}>
        <PlayerStats stats={stats} />
      </ChakraProvider>
    );
    cy.contains('100').should('have.css', 'background-image', 'linear-gradient(rgb(255, 215, 0), rgb(212, 175, 55))');
    cy.get('[data-testid="tier-crown"]').should('exist');
  });

  it('should render Silver tier correctly', () => {
    const stats = createMockStats([createMockLeaderboardStat(1400, 500)]);
    mount(
      <ChakraProvider theme={lightTheme}>
        <PlayerStats stats={stats} />
      </ChakraProvider>
    );
    cy.contains('500').should('have.css', 'background-image', 'linear-gradient(rgb(208, 208, 208), rgb(90, 100, 120))');
    cy.get('[data-testid="tier-crown"]').should('exist');
  });

  it('should render Bronze tier correctly', () => {
    const stats = createMockStats([createMockLeaderboardStat(1100, 1000)]);
    mount(
      <ChakraProvider theme={lightTheme}>
        <PlayerStats stats={stats} />
      </ChakraProvider>
    );
    cy.contains('1000').should('have.css', 'background-image', 'linear-gradient(rgb(205, 127, 50), rgb(179, 122, 62))');
    cy.get('[data-testid="tier-crown"]').should('exist');
  });

  it('should render Iron tier correctly (no crown)', () => {
    const stats = createMockStats([createMockLeaderboardStat(800, 5000)]);
    mount(
      <ChakraProvider theme={lightTheme}>
        <PlayerStats stats={stats} />
      </ChakraProvider>
    );
    cy.contains('5000').should('have.css', 'color', 'rgb(255, 255, 255)');
    cy.get('[data-testid="tier-crown"]').should('not.exist');
  });

  it('should not show a crown for unranked players', () => {
    const stats = createMockStats([createMockLeaderboardStat(1700, -1)]);
    mount(
      <ChakraProvider theme={lightTheme}>
        <PlayerStats stats={stats} />
      </ChakraProvider>
    );
    cy.get('[data-testid="tier-crown"]').should('not.exist');
  });
});