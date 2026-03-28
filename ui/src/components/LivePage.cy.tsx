/// <reference types="cypress" />

import React from 'react';
import { mount } from '@cypress/react';
import { MemoryRouter } from 'react-router-dom';
import { CustomThemeProvider } from '../theme/ThemeProvider';
import { LivePage } from './LivePage';
import { mockLiveMatches } from '../test/mocks';

const mountWithProviders = (children: React.ReactNode) => {
  mount(
    <MemoryRouter initialEntries={['/live']}>
      <CustomThemeProvider>{children}</CustomThemeProvider>
    </MemoryRouter>
  );
};

describe('LivePage', () => {
  // Use fake timers to prevent setInterval accumulation (causes SIGSEGV on macOS ARM Electron)
  beforeEach(() => {
    cy.clock();
  });


  it('shows crafted empty state when no matches', () => {
    cy.intercept('GET', '/api/live', { body: [] }).as('live');
    mountWithProviders(<LivePage />);
    cy.tick(100);
    cy.wait('@live');
    cy.contains('No battles rage at this hour').should('be.visible');
  });

  it('shows crafted error state on API failure', () => {
    cy.intercept('GET', '/api/live', { forceNetworkError: true }).as('live');
    mountWithProviders(<LivePage />);
    cy.tick(100);
    cy.contains('The scouts have lost their signal').should('be.visible');
  });

  it('renders match cards, tabs, and ActivityPanel', () => {
    cy.intercept('GET', '/api/live', { body: mockLiveMatches }).as('live');
    mountWithProviders(<LivePage />);
    cy.tick(100);
    cy.wait('@live');

    // Match cards
    cy.contains('AlphaWolf').should('be.visible');
    cy.contains('Arabia').should('be.visible');

    // Tabs
    cy.contains('RM 1v1').should('be.visible');

    // ActivityPanel
    cy.contains('Top Maps').should('be.visible');
    cy.contains('ELO Distribution').should('be.visible');

    // Player count header
    const totalPlayers = mockLiveMatches.reduce((sum, m) => sum + m.players.length, 0);
    cy.contains(`${totalPlayers} players`).should('be.visible');
  });

  it('filters matches when clicking a game type tab', () => {
    cy.intercept('GET', '/api/live', { body: mockLiveMatches }).as('live');
    mountWithProviders(<LivePage />);
    cy.tick(100);
    cy.wait('@live');

    cy.contains('button', /RM Team/).first().click();
    cy.contains('Player3').should('be.visible');
    cy.contains('AlphaWolf').should('not.exist');
  });

  it('filters by map and shows filter feedback', () => {
    cy.intercept('GET', '/api/live', { body: mockLiveMatches }).as('live');
    mountWithProviders(<LivePage />);
    cy.tick(100);
    cy.wait('@live');

    cy.contains('Arabia').click();
    cy.contains('Showing').should('be.visible');
  });

  it('civ filter narrows displayed matches', () => {
    cy.intercept('GET', '/api/live', { body: mockLiveMatches }).as('live');
    mountWithProviders(<LivePage />);
    cy.tick(100);
    cy.wait('@live');

    cy.get('input[placeholder="Type to filter..."]').type('Britons');
    cy.contains('AlphaWolf').should('be.visible');
  });

  it('has no horizontal overflow at 390px mobile', () => {
    cy.viewport(390, 844);
    cy.intercept('GET', '/api/live', { body: mockLiveMatches }).as('live');
    mountWithProviders(<LivePage />);
    cy.tick(100);
    cy.wait('@live');

    cy.document().then((doc) => {
      expect(doc.documentElement.scrollWidth).to.be.at.most(390);
    });
  });
});
