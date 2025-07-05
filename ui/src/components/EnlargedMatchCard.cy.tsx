/// <reference types="cypress" />

import { mount } from '@cypress/react';
import { ChakraProvider } from '@chakra-ui/react';
import { BrowserRouter } from 'react-router-dom';
import { EnlargedMatchCard } from './EnlargedMatchCard';
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

describe('EnlargedMatchCard Responsive Tests', () => {
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
    it('should display in column layout on mobile', () => {
      const mockMatch = createMockMatch();
      
      mount(
        <BrowserRouter>
          <ChakraProvider theme={theme}>
            <EnlargedMatchCard match={mockMatch} />
          </ChakraProvider>
        </BrowserRouter>
      );

      // Mobile viewport
      cy.viewport(400, 800);
      cy.wait(100); // Allow for responsive layout adjustment

      // Main content should be in column layout
      cy.get('[data-testid="match-card-content"]').should('have.css', 'flex-direction', 'column');
      
      // Map should be above teams
      cy.get('[data-testid="match-card-content"]').within(() => {
        cy.get('div').first().should('contain', 'Kawasan');
      });
    });

    it('should display in row layout on desktop', () => {
      const mockMatch = createMockMatch();
      
      mount(
        <BrowserRouter>
          <ChakraProvider theme={theme}>
            <EnlargedMatchCard match={mockMatch} />
          </ChakraProvider>
        </BrowserRouter>
      );

      // Desktop viewport
      cy.viewport(1200, 800);
      cy.wait(100); // Allow for responsive layout adjustment

      // Main content should be in row layout
      cy.get('[data-testid="match-card-content"]').should('have.css', 'flex-direction', 'row');
      
      // Map should be on the left, teams on the right
      cy.get('[data-testid="match-card-content"]').within(() => {
        cy.get('div').first().should('contain', 'Kawasan');
      });
    });
  });

  describe('Match Details Responsive Text', () => {
    it('should show short labels on mobile', () => {
      const mockMatch = createMockMatch();
      
      mount(
        <BrowserRouter>
          <ChakraProvider theme={theme}>
            <EnlargedMatchCard match={mockMatch} />
          </ChakraProvider>
        </BrowserRouter>
      );

      // Mobile viewport
      cy.viewport(400, 800);
      cy.wait(100);

      // Should show mobile labels
      cy.contains('Date').should('be.visible');
      cy.contains('Game').should('be.visible');
      cy.contains('Real').should('be.visible');
      
      // Should not show desktop labels
      cy.contains('Date & Time').should('not.be.visible');
      cy.contains('Game Duration').should('not.be.visible');
      cy.contains('Real Time').should('not.be.visible');
    });

    it('should show full labels on desktop', () => {
      const mockMatch = createMockMatch();
      
      mount(
        <BrowserRouter>
          <ChakraProvider theme={theme}>
            <EnlargedMatchCard match={mockMatch} />
          </ChakraProvider>
        </BrowserRouter>
      );

      // Desktop viewport
      cy.viewport(1200, 800);
      cy.wait(100);

      // Should show desktop labels
      cy.contains('Date & Time').should('be.visible');
      cy.contains('Game Duration').should('be.visible');
      cy.contains('Real Time').should('be.visible');
      
      // Should not show mobile labels
      cy.contains('Date').should('not.be.visible');
      cy.contains('Game').should('not.be.visible');
      cy.contains('Real').should('not.be.visible');
    });

    it('should have proper spacing between details on different screen sizes', () => {
      const mockMatch = createMockMatch();
      
      mount(
        <BrowserRouter>
          <ChakraProvider theme={theme}>
            <EnlargedMatchCard match={mockMatch} />
          </ChakraProvider>
        </BrowserRouter>
      );

      // Mobile viewport - tighter spacing
      cy.viewport(400, 800);
      cy.wait(100);
      
      // Check that details are in a horizontal stack with appropriate spacing
      cy.get('[data-testid="match-details"]').within(() => {
        cy.get('div').should('have.css', 'gap');
      });

      // Desktop viewport - more generous spacing
      cy.viewport(1200, 800);
      cy.wait(100);
      
      // Should have more generous spacing on desktop
      cy.get('[data-testid="match-details"]').within(() => {
        cy.get('div').should('have.css', 'gap');
      });
    });
  });

  describe('Player Avatar Responsive Behavior', () => {
    it('should show smaller avatars and elements on mobile', () => {
      const mockMatch = createMockMatch();
      
      mount(
        <BrowserRouter>
          <ChakraProvider theme={theme}>
            <EnlargedMatchCard match={mockMatch} />
          </ChakraProvider>
        </BrowserRouter>
      );

      // Mobile viewport
      cy.viewport(400, 800);
      cy.wait(100);

      // Avatars should be smaller (md size)
      cy.get('[data-testid="player-avatar"]').first().should('have.css', 'width', '48px'); // md size
      
      // Download buttons should be smaller
      cy.get('[data-testid="download-button"]').first().should('have.css', 'width', '18px');
      cy.get('[data-testid="download-button"]').first().should('have.css', 'height', '18px');
      
      // Player names should have smaller max width
      cy.get('[data-testid="player-name"]').first().should('have.css', 'max-width', '70px');
      
      // Color indicators should be smaller
      cy.get('[data-testid="color-indicator"]').first().should('have.css', 'width', '20px');
      cy.get('[data-testid="color-indicator"]').first().should('have.css', 'height', '14px');
    });

    it('should show larger avatars and elements on desktop', () => {
      const mockMatch = createMockMatch();
      
      mount(
        <BrowserRouter>
          <ChakraProvider theme={theme}>
            <EnlargedMatchCard match={mockMatch} />
          </ChakraProvider>
        </BrowserRouter>
      );

      // Desktop viewport
      cy.viewport(1200, 800);
      cy.wait(100);

      // Avatars should be larger (lg size)
      cy.get('[data-testid="player-avatar"]').first().should('have.css', 'width', '64px'); // lg size
      
      // Download buttons should be larger
      cy.get('[data-testid="download-button"]').first().should('have.css', 'width', '22px');
      cy.get('[data-testid="download-button"]').first().should('have.css', 'height', '22px');
      
      // Player names should have larger max width
      cy.get('[data-testid="player-name"]').first().should('have.css', 'max-width', '90px');
      
      // Color indicators should be larger
      cy.get('[data-testid="color-indicator"]').first().should('have.css', 'width', '24px');
      cy.get('[data-testid="color-indicator"]').first().should('have.css', 'height', '16px');
    });

    it('should properly truncate long player names on mobile', () => {
      const mockMatch = createMockMatch();
      mockMatch.teams[0][0].name = 'VeryLongPlayerNameThatShouldBeTruncated';
      
      mount(
        <BrowserRouter>
          <ChakraProvider theme={theme}>
            <EnlargedMatchCard match={mockMatch} />
          </ChakraProvider>
        </BrowserRouter>
      );

      // Mobile viewport
      cy.viewport(400, 800);
      cy.wait(100);

      // Player name should be truncated
      cy.get('[data-testid="player-name"]').should('have.css', 'text-overflow', 'ellipsis');
      cy.get('[data-testid="player-name"]').should('have.css', 'white-space', 'nowrap');
      cy.get('[data-testid="player-name"]').should('have.css', 'overflow', 'hidden');
      
      // Should have tooltip with full name
      cy.get('[data-testid="player-name"]').should('have.attr', 'title', 'VeryLongPlayerNameThatShouldBeTruncated');
    });
  });

  describe('Trophy and Winner Indication', () => {
    it('should position trophy correctly on mobile', () => {
      const mockMatch = createMockMatch();
      
      mount(
        <BrowserRouter>
          <ChakraProvider theme={theme}>
            <EnlargedMatchCard match={mockMatch} />
          </ChakraProvider>
        </BrowserRouter>
      );

      // Mobile viewport
      cy.viewport(400, 800);
      cy.wait(100);

      // Trophy should be visible for winning team
      cy.get('[data-testid="trophy-box"]').should('be.visible');
      cy.get('[data-testid="trophy-box"]').should('have.css', 'position', 'absolute');
      cy.get('[data-testid="trophy-box"]').should('have.css', 'top', '-16px');
      cy.get('[data-testid="trophy-box"]').should('have.css', 'right', '-12px');
    });

    it('should maintain trophy visibility on desktop', () => {
      const mockMatch = createMockMatch();
      
      mount(
        <BrowserRouter>
          <ChakraProvider theme={theme}>
            <EnlargedMatchCard match={mockMatch} />
          </ChakraProvider>
        </BrowserRouter>
      );

      // Desktop viewport
      cy.viewport(1200, 800);
      cy.wait(100);

      // Trophy should be visible and properly positioned
      cy.get('[data-testid="trophy-box"]').should('be.visible');
      cy.get('[data-testid="trophy-box"]').should('have.css', 'position', 'absolute');
      cy.get('[data-testid="trophy-box"]').should('have.css', 'z-index', '1');
    });
  });

  describe('Font Size Responsiveness', () => {
    it('should use smaller font sizes on mobile', () => {
      const mockMatch = createMockMatch();
      
      mount(
        <BrowserRouter>
          <ChakraProvider theme={theme}>
            <EnlargedMatchCard match={mockMatch} />
          </ChakraProvider>
        </BrowserRouter>
      );

      // Mobile viewport
      cy.viewport(400, 800);
      cy.wait(100);

      // Player names should use smaller font size
      cy.get('[data-testid="player-name"]').first().should('have.css', 'font-size', '12px'); // xs
      
      // Rating should use smaller font size
      cy.get('[data-testid="player-rating"]').first().should('have.css', 'font-size', '12px'); // xs
      
      // Details should use smaller font size
      cy.get('[data-testid="match-detail-value"]').first().should('have.css', 'font-size', '12px'); // xs
    });

    it('should use larger font sizes on desktop', () => {
      const mockMatch = createMockMatch();
      
      mount(
        <BrowserRouter>
          <ChakraProvider theme={theme}>
            <EnlargedMatchCard match={mockMatch} />
          </ChakraProvider>
        </BrowserRouter>
      );

      // Desktop viewport
      cy.viewport(1200, 800);
      cy.wait(100);

      // Player names should use larger font size
      cy.get('[data-testid="player-name"]').first().should('have.css', 'font-size', '14px'); // sm
      
      // Rating should use larger font size
      cy.get('[data-testid="player-rating"]').first().should('have.css', 'font-size', '14px'); // sm
      
      // Details should use larger font size
      cy.get('[data-testid="match-detail-value"]').first().should('have.css', 'font-size', '16px'); // md
    });
  });

  describe('Breakpoint Transitions', () => {
    it('should smoothly transition between layouts when resizing', () => {
      const mockMatch = createMockMatch();
      
      mount(
        <BrowserRouter>
          <ChakraProvider theme={theme}>
            <EnlargedMatchCard match={mockMatch} />
          </ChakraProvider>
        </BrowserRouter>
      );

      // Start with mobile
      cy.viewport(400, 800);
      cy.wait(100);
      
      // Should be in column layout
      cy.get('[data-testid="match-card-content"]').should('have.css', 'flex-direction', 'column');
      
      // Resize to tablet
      cy.viewport(768, 1024);
      cy.wait(100);
      
      // Should still be in column layout
      cy.get('[data-testid="match-card-content"]').should('have.css', 'flex-direction', 'column');
      
      // Resize to desktop (lg breakpoint)
      cy.viewport(1024, 768);
      cy.wait(100);
      
      // Should switch to row layout
      cy.get('[data-testid="match-card-content"]').should('have.css', 'flex-direction', 'row');
    });
  });

  describe('Content Wrapping and Overflow', () => {
    it('should handle content wrapping on narrow screens', () => {
      const mockMatch = createMockMatch();
      
      mount(
        <BrowserRouter>
          <ChakraProvider theme={theme}>
            <EnlargedMatchCard match={mockMatch} />
          </ChakraProvider>
        </BrowserRouter>
      );

      // Very narrow viewport
      cy.viewport(320, 568);
      cy.wait(100);

      // Match details should wrap appropriately
      cy.get('[data-testid="details-row"]').should('have.css', 'flex-wrap', 'wrap');
      
      // Player names should be truncated to prevent overflow
      cy.get('[data-testid="player-name"]').each(($el) => {
        cy.wrap($el).should('have.css', 'text-overflow', 'ellipsis');
        cy.wrap($el).should('have.css', 'overflow', 'hidden');
      });
    });

    it('should prevent horizontal overflow on mobile', () => {
      const mockMatch = createMockMatch();
      
      mount(
        <BrowserRouter>
          <ChakraProvider theme={theme}>
            <EnlargedMatchCard match={mockMatch} />
          </ChakraProvider>
        </BrowserRouter>
      );

      // Mobile viewport
      cy.viewport(400, 800);
      cy.wait(100);

      // Main container should not exceed viewport width
      cy.get('[data-testid="enlarged-match-card"]').should(($el) => {
        expect($el[0].scrollWidth).to.be.at.most(400);
      });
      
      // Team cards should not cause horizontal overflow
      cy.get('[data-testid="team-card"]').each(($el) => {
        cy.wrap($el).should('have.css', 'min-width', '0px');
      });
    });
  });
}); 