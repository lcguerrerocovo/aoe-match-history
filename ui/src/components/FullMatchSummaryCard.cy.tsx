/// <reference types="cypress" />

import { mount } from '@cypress/react';
import { ChakraProvider } from '@chakra-ui/react';
import { BrowserRouter } from 'react-router-dom';
import { FullMatchSummaryCard } from './FullMatchSummaryCard';
import { createTheme } from '../theme/theme';

// Mock the services module
before(() => {
  cy.stub(window, 'fetch').resolves({
    ok: true,
    json: () => Promise.resolve({ avatarfull: 'https://example.com/avatar.jpg' }),
  });
});

const createMockMatch = (numTeams: number = 2) => ({
  match_id: '404309454',
  start_time: '2025-07-05T15:34:00.000Z',
  description: 'RM Team',
  diplomacy: { type: 'RM Team', team_size: numTeams.toString() },
  map: 'Kawasan',
  options: '',
  duration: 1456, // 24:16
  winning_team: 1,
  winning_teams: [1],
  teams: Array.from({ length: numTeams }, (_, teamIndex) => 
    Array.from({ length: teamIndex === 0 ? 2 : 1 }, (_, playerIndex) => ({
      name: `Player${teamIndex + 1}-${playerIndex + 1}`,
      original_name: `/steam/76561198144754${teamIndex}${playerIndex}`,
      civ: ['Britons', 'Franks', 'Goths', 'Huns'][teamIndex + playerIndex],
      number: teamIndex * 2 + playerIndex + 1,
      color_id: teamIndex * 2 + playerIndex,
      user_id: (teamIndex * 2 + playerIndex + 1).toString(),
      winner: teamIndex === 0,
      rating: 1200 + (teamIndex * 100) + (playerIndex * 50),
      rating_change: teamIndex === 0 ? 15 : -15,
      save_game_size: 1024 * 50, // 50KB
    }))
  ),
});

const theme = createTheme(false);

describe('FullMatchSummaryCard Responsive Tests', () => {
  beforeEach(() => {
    // Reset stubs before each test
    cy.window().then((win) => {
      win.fetch = cy.stub().resolves({
        ok: true,
        json: () => Promise.resolve({ avatarfull: 'https://example.com/avatar.jpg' }),
      });
    });
  });

  describe('Layout Direction Changes', () => {
    it('should display correct layout for different viewports', () => {
      const mockMatch = createMockMatch();
      
      mount(
        <BrowserRouter>
          <ChakraProvider theme={theme}>
            <FullMatchSummaryCard match={mockMatch} />
          </ChakraProvider>
        </BrowserRouter>
      );

      // Mobile viewport - column layout
      cy.viewport(400, 800);
      cy.wait(50);
      cy.get('[data-testid="match-card-content"]').should('have.css', 'flex-direction', 'column');
      
      // Desktop viewport - row layout
      cy.viewport(1200, 800);
      cy.wait(50);
      cy.get('[data-testid="match-card-content"]').should('have.css', 'flex-direction', 'row');
    });
  });

  describe('Match Details Responsive Text', () => {
    it('should show appropriate labels and spacing for different viewports', () => {
      const mockMatch = createMockMatch();
      
      mount(
        <BrowserRouter>
          <ChakraProvider theme={theme}>
            <FullMatchSummaryCard match={mockMatch} />
          </ChakraProvider>
        </BrowserRouter>
      );

      // Mobile viewport - short labels
      cy.viewport(400, 800);
      cy.wait(50);
      cy.contains('Date').should('be.visible');
      cy.contains('Game').should('be.visible');
      cy.contains('Real').should('be.visible');
      cy.get('[data-testid="match-details"]').within(() => {
        cy.get('div').should('have.css', 'gap');
      });

      // Desktop viewport - full labels
      cy.viewport(1200, 800);
      cy.wait(50);
      cy.contains('Date & Time').should('be.visible');
      cy.contains('Game Duration').should('be.visible');
      cy.contains('Real Time').should('be.visible');
    });
  });

  describe('Player Avatar Responsive Behavior', () => {

    it('should properly truncate long player names on mobile', () => {
      const mockMatch = createMockMatch();
      mockMatch.teams[0][0].name = 'VeryLongPlayerNameThatShouldBeTruncated';
      
      mount(
        <BrowserRouter>
          <ChakraProvider theme={theme}>
            <FullMatchSummaryCard match={mockMatch} />
          </ChakraProvider>
        </BrowserRouter>
      );

      // Mobile viewport
      cy.viewport(400, 800);
      cy.wait(50);

      // Player name should be truncated
      cy.get('[data-testid="player-name"]').should('have.css', 'text-overflow', 'ellipsis');
      cy.get('[data-testid="player-name"]').should('have.css', 'white-space', 'nowrap');
      cy.get('[data-testid="player-name"]').should('have.css', 'overflow', 'hidden');
      
      // Should have tooltip with full name
      cy.get('[data-testid="player-name"]').should('have.attr', 'title', 'VeryLongPlayerNameThatShouldBeTruncated');
    });
  });

  describe('Trophy and Winner Indication', () => {
    it('should display trophy correctly across viewports', () => {
      const mockMatch = createMockMatch();
      
      mount(
        <BrowserRouter>
          <ChakraProvider theme={theme}>
            <FullMatchSummaryCard match={mockMatch} />
          </ChakraProvider>
        </BrowserRouter>
      );

      // Mobile viewport
      cy.viewport(400, 800);
      cy.wait(50);
      cy.get('[data-testid="trophy-box"]').should('be.visible');
      cy.get('[data-testid="trophy-box"]').should('have.css', 'position', 'absolute');

      // Desktop viewport
      cy.viewport(1200, 800);
      cy.wait(50);
      cy.get('[data-testid="trophy-box"]').should('be.visible');
      cy.get('[data-testid="trophy-box"]').should('have.css', 'z-index', '1');
    });
  });

  describe('Font Size Responsiveness', () => {

    it('should use larger font sizes on desktop', () => {
      const mockMatch = createMockMatch();
      
      mount(
        <BrowserRouter>
          <ChakraProvider theme={theme}>
            <FullMatchSummaryCard match={mockMatch} />
          </ChakraProvider>
        </BrowserRouter>
      );

      // Desktop viewport
      cy.viewport(1200, 800);
      cy.wait(50);

      // Player names should use larger font size
      cy.get('[data-testid="player-name"]').first().should('have.css', 'font-size', '14px'); // sm
      
      // Rating should use larger font size
      cy.get('[data-testid="player-rating"]').first().should('have.css', 'font-size', '14px'); // sm
      
      // Details should use larger font size
      cy.get('[data-testid="match-detail-value"]').first().should('have.css', 'font-size', '16px'); // md
    });
  });

  describe('Breakpoint Transitions', () => {
    it('should transition between layouts when resizing', () => {
      const mockMatch = createMockMatch();
      
      mount(
        <BrowserRouter>
          <ChakraProvider theme={theme}>
            <FullMatchSummaryCard match={mockMatch} />
          </ChakraProvider>
        </BrowserRouter>
      );

      // Mobile - column layout
      cy.viewport(400, 800);
      cy.wait(50);
      cy.get('[data-testid="match-card-content"]').should('have.css', 'flex-direction', 'column');
      
      // Desktop - row layout
      cy.viewport(1024, 768);
      cy.wait(50);
      cy.get('[data-testid="match-card-content"]').should('have.css', 'flex-direction', 'row');
    });
  });

  describe('Content Wrapping and Overflow', () => {
    it('should handle content wrapping and prevent overflow', () => {
      const mockMatch = createMockMatch();
      
      mount(
        <BrowserRouter>
          <ChakraProvider theme={theme}>
            <FullMatchSummaryCard match={mockMatch} />
          </ChakraProvider>
        </BrowserRouter>
      );

      // Very narrow viewport
      cy.viewport(320, 568);
      cy.wait(50);
      cy.get('[data-testid="details-row"]').should('have.css', 'flex-wrap', 'wrap');
      cy.get('[data-testid="player-name"]').each(($el) => {
        cy.wrap($el).should('have.css', 'text-overflow', 'ellipsis');
        cy.wrap($el).should('have.css', 'overflow', 'hidden');
      });

      // Mobile viewport
      cy.viewport(400, 800);
      cy.wait(50);
      cy.get('[data-testid="enlarged-match-card"]').should(($el) => {
        expect($el[0].scrollWidth).to.be.at.most(400);
      });
    });
  });
}); 