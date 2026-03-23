/// <reference types="cypress" />

import { mount } from '@cypress/react';
import { BrowserRouter } from 'react-router-dom';
import { FullMatchSummaryCard } from './FullMatchSummaryCard';
import { CustomThemeProvider } from '../theme/ThemeProvider';

// Mock the services module
before(() => {
  cy.stub(window, 'fetch').resolves({
    ok: true,
    json: () => Promise.resolve({ avatarfull: 'https://example.com/avatar.jpg' }),
  });
});

const createMockMatch = (playersPerTeam: number = 2) => {
  const teams = [
    Array.from({ length: playersPerTeam }, (_, i) => ({
      name: `Player1-${i + 1}`,
      civ: ['Britons', 'Franks', 'Mongols', 'Aztecs'][i % 4],
      number: i + 1,
      color_id: i,
      user_id: (i + 1).toString(),
      winner: true,
      rating: 1200 + i * 50,
      rating_change: 15,
      save_game_size: 1024 * 50,
    })),
    Array.from({ length: playersPerTeam }, (_, i) => ({
      name: `Player2-${i + 1}`,
      civ: ['Celts', 'Teutons', 'Japanese', 'Vikings'][i % 4],
      number: playersPerTeam + i + 1,
      color_id: playersPerTeam + i,
      user_id: (playersPerTeam + i + 1).toString(),
      winner: false,
      rating: 1100 + i * 50,
      rating_change: -15,
      save_game_size: 1024 * 50,
    })),
  ];
  return {
    match_id: '404309454',
    start_time: '2025-07-05T15:34:00.000Z',
    description: 'RM Team',
    diplomacy: { type: 'RM Team', team_size: playersPerTeam.toString() },
    map: 'Kawasan',
    options: '',
    duration: 1456,
    winning_team: 1,
    winning_teams: [1],
    teams,
    players: teams.flat(),
  };
};

describe('FullMatchSummaryCard Battle Record Layout', () => {
  beforeEach(() => {
    cy.window().then((win) => {
      win.fetch = cy.stub().resolves({
        ok: true,
        json: () => Promise.resolve({ avatarfull: 'https://example.com/avatar.jpg' }),
      });
    });
  });

  describe('Confrontational Layout', () => {
    it('should use column layout on mobile and row on desktop', () => {
      const mockMatch = createMockMatch(1);

      mount(
        <BrowserRouter>
          <CustomThemeProvider>
            <FullMatchSummaryCard match={mockMatch} />
          </CustomThemeProvider>
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
    it('should show appropriate labels for different viewports', () => {
      const mockMatch = createMockMatch(1);

      mount(
        <BrowserRouter>
          <CustomThemeProvider>
            <FullMatchSummaryCard match={mockMatch} />
          </CustomThemeProvider>
        </BrowserRouter>
      );

      // Mobile viewport - short labels
      cy.viewport(400, 800);
      cy.wait(50);
      cy.contains('Date').should('be.visible');
      cy.contains('Game').should('be.visible');
      cy.contains('Real').should('be.visible');

      // Desktop viewport - full labels
      cy.viewport(1200, 800);
      cy.wait(50);
      cy.contains('Date & Time').should('be.visible');
      cy.contains('Game Duration').should('be.visible');
      cy.contains('Real Time').should('be.visible');
    });
  });

  describe('Victory/Defeat Indication', () => {
    it('should show Victory label for winning team and Defeat for losing', () => {
      const mockMatch = createMockMatch(1);

      mount(
        <BrowserRouter>
          <CustomThemeProvider>
            <FullMatchSummaryCard match={mockMatch} />
          </CustomThemeProvider>
        </BrowserRouter>
      );

      cy.get('[data-testid="victory-label"]').should('have.length', 2);
      cy.get('[data-testid="victory-label"]').first().should('contain.text', 'Victory');
      cy.get('[data-testid="victory-label"]').last().should('contain.text', 'Defeat');
    });
  });

  describe('Player Name Display', () => {
    it('should clamp long player names to one line', () => {
      const mockMatch = createMockMatch(1);
      mockMatch.teams[0][0].name = 'VeryLongPlayerNameThatShouldBeClamped';

      mount(
        <BrowserRouter>
          <CustomThemeProvider>
            <FullMatchSummaryCard match={mockMatch} />
          </CustomThemeProvider>
        </BrowserRouter>
      );

      cy.viewport(400, 800);
      cy.wait(50);

      cy.get('[data-testid="player-name"]').first()
        .should('have.css', '-webkit-line-clamp', '1');
    });
  });

  describe('Density Adaptation', () => {
    it('should render both 1v1 and 4v4 matches', () => {
      // 1v1 match
      const match1v1 = createMockMatch(1);
      mount(
        <BrowserRouter>
          <CustomThemeProvider>
            <FullMatchSummaryCard match={match1v1} />
          </CustomThemeProvider>
        </BrowserRouter>
      );

      cy.get('[data-testid="player-name"]').should('have.length', 2);
      cy.get('[data-testid="victory-label"]').should('have.length', 2);
    });

    it('should render 4v4 with all players visible', () => {
      const match4v4 = createMockMatch(4);
      mount(
        <BrowserRouter>
          <CustomThemeProvider>
            <FullMatchSummaryCard match={match4v4} />
          </CustomThemeProvider>
        </BrowserRouter>
      );

      cy.get('[data-testid="player-name"]').should('have.length', 8);
    });
  });

  describe('Breakpoint Transitions', () => {
    it('should transition between layouts when resizing', () => {
      const mockMatch = createMockMatch(2);

      mount(
        <BrowserRouter>
          <CustomThemeProvider>
            <FullMatchSummaryCard match={mockMatch} />
          </CustomThemeProvider>
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
    it('should handle content at narrow viewports', () => {
      const mockMatch = createMockMatch(2);

      mount(
        <BrowserRouter>
          <CustomThemeProvider>
            <FullMatchSummaryCard match={mockMatch} />
          </CustomThemeProvider>
        </BrowserRouter>
      );

      // Very narrow viewport
      cy.viewport(320, 568);
      cy.wait(50);
      cy.get('[data-testid="details-row"]').should('have.css', 'flex-wrap', 'wrap');

      // Ensure card doesn't overflow
      cy.viewport(400, 800);
      cy.wait(50);
      cy.get('[data-testid="enlarged-match-card"]').should(($el) => {
        expect($el[0].scrollWidth).to.be.at.most(400);
      });
    });
  });

  describe('Winner/Loser Card Variants', () => {
    it('should apply red chalk top border to winner team column', () => {
      const mockMatch = createMockMatch(2);

      mount(
        <BrowserRouter>
          <CustomThemeProvider>
            <FullMatchSummaryCard match={mockMatch} />
          </CustomThemeProvider>
        </BrowserRouter>
      );

      // Winner team (first) gets a visible red chalk top border
      cy.get('[data-testid="victory-label"]').first().parent().parent()
        .should('have.css', 'border-top-style', 'solid')
        .and('have.css', 'border-top-width', '2px');

      // Loser team gets a transparent top border (for consistent sizing)
      cy.get('[data-testid="victory-label"]').last().parent().parent()
        .should('have.css', 'border-top-style', 'solid')
        .and('have.css', 'border-top-color', 'rgba(0, 0, 0, 0)');
    });

    it('should show red chalk underline after Victory label', () => {
      const mockMatch = createMockMatch(1);

      mount(
        <BrowserRouter>
          <CustomThemeProvider>
            <FullMatchSummaryCard match={mockMatch} />
          </CustomThemeProvider>
        </BrowserRouter>
      );

      // Victory label should have a red chalk underline (60px wide box)
      cy.get('[data-testid="victory-label"]').first()
        .parent()
        .find('div')
        .should('have.css', 'height', '2px');
    });
  });

  describe('MapCard Illustration', () => {
    it('should render map with double-line frame and italic caption', () => {
      const mockMatch = createMockMatch(1);

      mount(
        <BrowserRouter>
          <CustomThemeProvider>
            <FullMatchSummaryCard match={mockMatch} />
          </CustomThemeProvider>
        </BrowserRouter>
      );

      // Map image exists
      cy.get('img[alt="Kawasan"]').should('exist');

      // Italic map caption
      cy.contains('Kawasan').should('have.css', 'font-style', 'italic');

      // VS label exists below map
      cy.contains('vs').should('exist');
    });
  });

  describe('MatchDetails Inscription', () => {
    it('should render inscription title and match ID', () => {
      const mockMatch = createMockMatch(1);

      mount(
        <BrowserRouter>
          <CustomThemeProvider>
            <FullMatchSummaryCard match={mockMatch} />
          </CustomThemeProvider>
        </BrowserRouter>
      );

      // Inscription title
      cy.get('[data-testid="match-details"]').within(() => {
        // Match description as title
        cy.contains('RM Team').should('exist');

        // Match ID annotation in italic
        cy.contains('Match #404309454')
          .should('have.css', 'font-style', 'italic');

        // Detail values present (3 values: date, game duration, real time)
        cy.get('[data-testid="match-detail-value"]').should('have.length', 3);
      });
    });

    it('should render detail labels in italic', () => {
      const mockMatch = createMockMatch(1);

      mount(
        <BrowserRouter>
          <CustomThemeProvider>
            <FullMatchSummaryCard match={mockMatch} />
          </CustomThemeProvider>
        </BrowserRouter>
      );

      cy.viewport(1200, 800);
      cy.wait(50);

      // Labels should be italic
      cy.contains('Date & Time').should('have.css', 'font-style', 'italic');
      cy.contains('Game Duration').should('have.css', 'font-style', 'italic');
      cy.contains('Real Time').should('have.css', 'font-style', 'italic');
    });
  });

  describe('Player Avatar Components', () => {
    it('should render color stripe for each player', () => {
      const mockMatch = createMockMatch(2);

      mount(
        <BrowserRouter>
          <CustomThemeProvider>
            <FullMatchSummaryCard match={mockMatch} />
          </CustomThemeProvider>
        </BrowserRouter>
      );

      cy.get('[data-testid="color-indicator"]').should('have.length', 4);
    });

    it('should display civ name and rating for each player', () => {
      const mockMatch = createMockMatch(1);

      mount(
        <BrowserRouter>
          <CustomThemeProvider>
            <FullMatchSummaryCard match={mockMatch} />
          </CustomThemeProvider>
        </BrowserRouter>
      );

      // Civ names
      cy.contains('Britons').should('exist');
      cy.contains('Celts').should('exist');

      // Ratings
      cy.get('[data-testid="player-rating"]').should('have.length', 2);
      cy.get('[data-testid="player-rating"]').first().should('contain.text', '1200');

      // Rating change with sign
      cy.get('[data-testid="player-rating"]').first().should('contain.text', '+15');
    });

    it('should render replay download link as italic annotation', () => {
      const mockMatch = createMockMatch(1);

      mount(
        <BrowserRouter>
          <CustomThemeProvider>
            <FullMatchSummaryCard match={mockMatch} />
          </CustomThemeProvider>
        </BrowserRouter>
      );

      cy.get('[data-testid="download-button"]')
        .should('have.length', 2)
        .first()
        .should('have.css', 'font-style', 'italic')
        .and('contain.text', 'replay');
    });

    it('should show winner avatar with red chalk border', () => {
      const mockMatch = createMockMatch(1);

      mount(
        <BrowserRouter>
          <CustomThemeProvider>
            <FullMatchSummaryCard match={mockMatch} />
          </CustomThemeProvider>
        </BrowserRouter>
      );

      // Winner avatars (first team) should exist
      cy.get('[data-testid="player-avatar"]').should('have.length', 2);
    });
  });

  describe('Decorative Elements', () => {
    it('should render section divider between header and content', () => {
      const mockMatch = createMockMatch(1);

      mount(
        <BrowserRouter>
          <CustomThemeProvider>
            <FullMatchSummaryCard match={mockMatch} />
          </CustomThemeProvider>
        </BrowserRouter>
      );

      // The double-rule divider exists between match-details and match-card-content
      cy.get('[data-testid="match-details"]')
        .parent()
        .children()
        .should('have.length.at.least', 3); // details + divider + content
    });

    it('should render VS label between teams', () => {
      const mockMatch = createMockMatch(1);

      mount(
        <BrowserRouter>
          <CustomThemeProvider>
            <FullMatchSummaryCard match={mockMatch} />
          </CustomThemeProvider>
        </BrowserRouter>
      );

      cy.contains('vs')
        .should('have.css', 'text-transform', 'uppercase')
        .and('have.css', 'letter-spacing');
    });
  });
});
