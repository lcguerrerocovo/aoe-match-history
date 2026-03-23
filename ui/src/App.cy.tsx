/// <reference types="cypress" />

import { mount } from '@cypress/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import App from './App';
import { CustomThemeProvider } from './theme/ThemeProvider';

describe('App Responsive Layout', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/match-history/*', { statusCode: 200, body: { matches: [], name: 'TestPlayer' } });
    cy.intercept('GET', '**/personal-stats/*', { statusCode: 200, body: { statGroups: [], leaderboardStats: [] } });
  });

  const renderApp = () => {
    mount(
      <MemoryRouter initialEntries={['/profile_id/12345']}>
        <CustomThemeProvider>
          <Routes>
            <Route path="/profile_id/:profileId" element={<App />} />
          </Routes>
        </CustomThemeProvider>
      </MemoryRouter>
    );
  };

  it('should stack ProfileHeader vertically on mobile and horizontally on desktop/tablet', () => {
    renderApp();

    // Test mobile view
    cy.viewport(400, 600);
    cy.get('[data-testid="profile-header-stack"]').should('have.css', 'flex-direction', 'column');

    // Test tablet view (iPad Pro)
    cy.viewport(1024, 1366);
    cy.get('[data-testid="profile-header-stack"]').should('have.css', 'flex-direction', 'row');

    // Test desktop view
    cy.viewport(1400, 900);
    cy.get('[data-testid="profile-header-stack"]').should('have.css', 'flex-direction', 'row');
  });

  it('should display a parchment background on all screen sizes', () => {
    renderApp();

    // Test mobile view
    cy.viewport(400, 600);
    cy.get('body').should('have.css', 'background-color', 'rgb(248, 243, 230)'); // parchment
    cy.get('[data-testid="floating-box-container"]').should('have.css', 'background-color', 'rgba(0, 0, 0, 0)'); // transparent — body provides texture

    // Test desktop view — body is now parchment everywhere (unified manuscript feel)
    cy.viewport(1400, 900);
    cy.get('body').should('have.css', 'background-color', 'rgb(248, 243, 230)'); // parchment
    cy.get('[data-testid="floating-box-container"]').should('have.css', 'background-color', 'rgba(0, 0, 0, 0)'); // transparent — body provides texture
  });
});

describe('App Filter Dropdown Counts', () => {
  const fullMatchHistoryResponse = {
    matches: [
      {
        match_id: '1',
        start_time: '2026-03-20T10:00:00Z',
        description: 'RM 1v1',
        diplomacy: { type: 'RM 1v1', team_size: '2' },
        map: 'Arabia',
        options: '',
        duration: 1800,
        teams: [[{ name: 'P1', civ: 'Britons', number: 1, color_id: 0, user_id: '1', winner: true, rating: 1200, rating_change: 10 }],
                [{ name: 'P2', civ: 'Franks', number: 2, color_id: 1, user_id: '2', winner: false, rating: 1190, rating_change: -10 }]],
        players: [{ name: 'P1', civ: 'Britons', number: 1, color_id: 0, user_id: '1', winner: true, rating: 1200, rating_change: 10 },
                  { name: 'P2', civ: 'Franks', number: 2, color_id: 1, user_id: '2', winner: false, rating: 1190, rating_change: -10 }],
        winning_team: 1,
        winning_teams: [1],
      },
      {
        match_id: '2',
        start_time: '2026-03-20T12:00:00Z',
        description: 'RM Team',
        diplomacy: { type: 'RM Team', team_size: '4' },
        map: 'Black Forest',
        options: '',
        duration: 2400,
        teams: [[{ name: 'P1', civ: 'Britons', number: 1, color_id: 0, user_id: '1', winner: true, rating: 1100, rating_change: 10 }],
                [{ name: 'P2', civ: 'Franks', number: 2, color_id: 1, user_id: '2', winner: false, rating: 1090, rating_change: -10 }]],
        players: [{ name: 'P1', civ: 'Britons', number: 1, color_id: 0, user_id: '1', winner: true, rating: 1100, rating_change: 10 },
                  { name: 'P2', civ: 'Franks', number: 2, color_id: 1, user_id: '2', winner: false, rating: 1090, rating_change: -10 }],
        winning_team: 1,
        winning_teams: [1],
      },
    ],
    hasMore: false,
    filterOptions: {
      maps: [
        { name: 'Arabia', count: 25 },
        { name: 'Black Forest', count: 15 },
      ],
      matchTypes: [
        { ids: [6], name: 'RM 1v1', count: 25 },
        { ids: [7, 8, 9], name: 'RM Team', count: 15 },
      ],
    },
  };

  const filteredResponse = {
    matches: [fullMatchHistoryResponse.matches[0]],
    hasMore: false,
  };

  const renderApp = () => {
    mount(
      <MemoryRouter initialEntries={['/profile_id/12345']}>
        <CustomThemeProvider>
          <Routes>
            <Route path="/profile_id/:profileId" element={<App />} />
          </Routes>
        </CustomThemeProvider>
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    cy.on('uncaught:exception', () => false);
  });

  it('should preserve all match type options with total counts after selecting a filter', () => {
    // Intercept legacy endpoint as fallback
    cy.intercept('GET', /match-history\/12345$/, { statusCode: 200, body: { matches: [], name: 'TestPlayer' } });
    // Initial load returns all matches with filterOptions
    cy.intercept('GET', /match-history\/12345\/full/, (req) => {
      const url = new URL(req.url);
      const headers = { 'content-type': 'application/json' };
      if (url.searchParams.get('matchType')) {
        req.reply({ statusCode: 200, body: filteredResponse, headers });
      } else {
        req.reply({ statusCode: 200, body: fullMatchHistoryResponse, headers });
      }
    }).as('fullHistory');
    cy.intercept('GET', /personal-stats/, { statusCode: 200, body: { statGroups: [], leaderboardStats: [] } });

    renderApp();
    cy.wait('@fullHistory');

    // Verify initial dropdown shows both match types with server counts
    cy.get('option').should('have.length.greaterThan', 2);
    cy.get('option').contains('RM 1v1 (25)').should('exist');
    cy.get('option').contains('RM Team (15)').should('exist');

    // Select "RM 1v1" filter
    cy.get('select').last().select('RM 1v1');
    cy.wait('@fullHistory');

    // After filtering, dropdown should STILL show all options with total counts
    cy.get('option').contains('RM 1v1 (25)').should('exist');
    cy.get('option').contains('RM Team (15)').should('exist');
  });
});