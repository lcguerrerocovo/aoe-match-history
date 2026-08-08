/// <reference types="cypress" />

import React from 'react';
import { mount } from '@cypress/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { CustomThemeProvider } from '../theme/ThemeProvider';
import { LivePage } from './LivePage';
import { mockLiveMatches } from '../test/mocks';

// Spy that exposes the in-memory router's search string via a real (hidden)
// DOM element so assertions retry cleanly in both Chrome and Electron. A
// null-returning spy can be optimized out / not re-render, causing hangs.
const SearchSpy = () => {
  const loc = useLocation();
  return (
    <span data-testid="url-search" data-search={loc.search} style={{ display: 'none' }} />
  );
};

const mountWithProviders = (children: React.ReactNode) => {
  mount(
    <MemoryRouter initialEntries={['/live']}>
      <CustomThemeProvider>{children}<SearchSpy /></CustomThemeProvider>
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
    cy.intercept('POST', '/api/live/ratings', { body: {} }).as('ratings');
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
    cy.get('@ratings.all').should('have.length', 0);
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

  // #38 regression guard: clicking a game-type tab must write ?type= to the URL.
  it('writes ?type= to the router when a game-type tab is clicked', () => {
    cy.intercept('GET', '/api/live', { body: mockLiveMatches }).as('live');
    mountWithProviders(<LivePage />);
    cy.tick(100);
    cy.wait('@live');

    cy.contains('button', /RM Team/).first().click();
    cy.get('[data-testid="url-search"]').invoke('attr', 'data-search').should('include', 'type=');
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

  it('gives up stale retries after a bound and shows delayed data with a notice', () => {
    // Real timers: the retry timer is registered only after the stubbed
    // response is processed, which a mocked clock can't deterministically
    // interleave with. The 3s retry cadence is paced by cy.wait instead.
    cy.clock().invoke('restore');
    // Newest match far in the past — beyond the 5 min staleness threshold
    const staleMatches = mockLiveMatches.map((m) => ({ ...m, start_time: -601 }));
    cy.intercept('GET', '/api/live', { body: staleMatches }).as('live');
    mountWithProviders(<LivePage />);
    cy.wait('@live'); // initial fetch — stale, enters retry loop
    cy.wait('@live', { requestTimeout: 8000 }); // retry 1 (after 3s)
    cy.wait('@live', { requestTimeout: 8000 }); // retry 2
    cy.wait('@live', { requestTimeout: 8000 }); // retry 3 — bound reached, data accepted

    cy.contains('Scout reports delayed').should('be.visible');
    cy.contains('AlphaWolf').should('be.visible');
    cy.get('@live.all').should('have.length', 4);
    // No retry 4: the loop gives up rather than retrying forever
    cy.wait(3500);
    cy.get('@live.all').should('have.length', 4);
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
