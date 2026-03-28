/// <reference types="cypress" />

import React from 'react';
import { mount } from '@cypress/react';
import { MemoryRouter } from 'react-router-dom';
import { CustomThemeProvider } from '../theme/ThemeProvider';
import { LiveMatchCard, LiveMatchCardSkeleton } from './LiveMatchCard';
import { mockLiveMatch, mockLiveMatches } from '../test/mocks';

const mountWithProviders = (children: React.ReactNode) => {
  mount(
    <MemoryRouter>
      <CustomThemeProvider>{children}</CustomThemeProvider>
    </MemoryRouter>
  );
};

describe('LiveMatchCard', () => {
  it('renders game type, map, and LIVE pill', () => {
    mountWithProviders(<LiveMatchCard match={mockLiveMatch} />);
    cy.contains('RM 1v1').should('be.visible');
    cy.contains('Arabia').should('be.visible');
    cy.contains('Live').should('be.visible');
  });

  it('renders player names and ratings', () => {
    mountWithProviders(<LiveMatchCard match={mockLiveMatch} />);
    cy.contains('AlphaWolf').should('be.visible');
    cy.contains('BetaStrike').should('be.visible');
    cy.contains('1350').should('be.visible');
    cy.contains('1280').should('be.visible');
  });

  it('renders spectate link with correct deep link', () => {
    mountWithProviders(<LiveMatchCard match={mockLiveMatch} />);
    cy.contains('Spectate')
      .closest('a')
      .should('have.attr', 'href', `aoe2de://1/${mockLiveMatch.match_id}`);
  });

  it('shows avgRating in footer when provided', () => {
    mountWithProviders(<LiveMatchCard match={mockLiveMatch} avgRating={1315} />);
    cy.contains('~1315 avg').should('be.visible');
  });

  it('does not show avgRating when not provided', () => {
    mountWithProviders(<LiveMatchCard match={mockLiveMatch} />);
    cy.contains('avg').should('not.exist');
  });

  it('highlights a specific player', () => {
    mountWithProviders(
      <LiveMatchCard match={mockLiveMatch} highlightProfileId={1001} />
    );
    cy.contains('AlphaWolf')
      .should('have.css', 'font-weight')
      .and('match', /700|bold/);
  });

  it('renders team match with multiple players per team', () => {
    const teamMatch = mockLiveMatches[1]; // RM Team, 4 players
    mountWithProviders(<LiveMatchCard match={teamMatch} />);
    cy.contains('Player3').should('be.visible');
    cy.contains('Player4').should('be.visible');
    cy.contains('Player5').should('be.visible');
    cy.contains('Player6').should('be.visible');
  });

  describe('responsive layout', () => {
    it('stacks teams vertically on mobile', () => {
      cy.viewport(390, 844);
      const teamMatch = mockLiveMatches[1];
      mountWithProviders(<LiveMatchCard match={teamMatch} />);
      cy.get('[data-testid="teams-container"]')
        .should('have.css', 'flex-direction', 'column');
    });

    it('shows teams side by side on desktop', () => {
      cy.viewport(1200, 900);
      const teamMatch = mockLiveMatches[1];
      mountWithProviders(<LiveMatchCard match={teamMatch} />);
      cy.get('[data-testid="teams-container"]')
        .should('have.css', 'flex-direction', 'row');
    });
  });
});

describe('LiveMatchCardSkeleton', () => {
  it('renders without crashing', () => {
    mountWithProviders(<LiveMatchCardSkeleton />);
    // Skeleton should have visible structure
    cy.get('[class]').should('have.length.greaterThan', 0);
  });
});
