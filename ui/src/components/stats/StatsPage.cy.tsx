/// <reference types="cypress" />

import { mount } from '@cypress/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { CustomThemeProvider } from '../../theme/ThemeProvider';
import { StatsPage } from './StatsPage';

// Spy that exposes the in-memory router's pathname + search via real (hidden)
// DOM elements so assertions retry cleanly in both Chrome and Electron (a
// null-returning spy can be optimized out / not re-render, causing hangs).
const RouterSpy = () => {
  const loc = useLocation();
  return (
    <>
      <span data-testid="url-path" data-path={loc.pathname} style={{ display: 'none' }} />
      <span data-testid="url-search" data-search={loc.search} style={{ display: 'none' }} />
    </>
  );
};

// Minimal CivStatsData mock: one civ (Britons) on Arabia in 1v1/all.
const civStatsMock = {
  meta: {
    generatedAt: '2026-08-08T00:00:00Z',
    patches: {
      current: { version: 101, date: '2025-01-01', title: 'P101' },
      previous: { version: 100, date: '2024-01-01', title: 'P100' },
    },
    eloBrackets: ['all', '<1000', '1000-1500', '1500+'],
    totalPicks: {
      '1v1': { all: { current: 10, previous: 5 }, '<1000': { current: 0, previous: 0 }, '1000-1500': { current: 0, previous: 0 }, '1500+': { current: 0, previous: 0 } },
      team: { all: { current: 0, previous: 0 }, '<1000': { current: 0, previous: 0 }, '1000-1500': { current: 0, previous: 0 }, '1500+': { current: 0, previous: 0 } },
    },
    totalPicksByMap: {
      '1v1': { current: { Arabia: 10 }, previous: { Arabia: 5 } },
      team: { current: {}, previous: {} },
    },
  },
  '1v1': {
    all: { civs: { Britons: { current: { wins: 6, losses: 4, totalGames: 10, winRate: 0.6, pickRate: 1, maps: { Arabia: { wins: 6, losses: 4, totalGames: 10, winRate: 0.6, pickRate: 1 } } }, previous: { wins: 0, losses: 0, totalGames: 0, winRate: 0, pickRate: 0, maps: {} } } } },
    '<1000': { civs: {} },
    '1000-1500': { civs: {} },
    '1500+': { civs: {} },
  },
  team: {
    all: { civs: {} },
    '<1000': { civs: {} },
    '1000-1500': { civs: {} },
    '1500+': { civs: {} },
  },
};

const renderStats = (initial: string) => {
  mount(
    <MemoryRouter initialEntries={[initial]}>
      <CustomThemeProvider>
        <Routes>
          <Route path="/stats/win-rates" element={<><StatsPage /><RouterSpy /></>} />
          <Route path="/stats/team-positions" element={<><StatsPage /><RouterSpy /></>} />
          <Route path="/stats/*" element={<><StatsPage /><RouterSpy /></>} />
        </Routes>
      </CustomThemeProvider>
    </MemoryRouter>
  );
};

describe('StatsPage URL-aware state (#38 guard)', () => {
  beforeEach(() => {
    cy.on('uncaught:exception', () => false);
    cy.intercept('GET', '/data/civ-stats.json', { statusCode: 200, body: civStatsMock }).as('civStats');
  });

  it('clicking the Team Positions tab navigates to /stats/team-positions', () => {
    renderStats('/stats/win-rates');
    cy.wait('@civStats');
    cy.contains('button', /Team Positions/i).click();
    cy.get('[data-testid="url-path"]').invoke('attr', 'data-path').should('eq', '/stats/team-positions');
  });

  it('clicking the Win Rates tab navigates to /stats/win-rates', () => {
    renderStats('/stats/team-positions');
    cy.wait('@civStats');
    cy.contains('button', /Win Rates/i).click();
    cy.get('[data-testid="url-path"]').invoke('attr', 'data-path').should('eq', '/stats/win-rates');
  });

  it('changing matchType filter writes ?matchType= to the router', () => {
    renderStats('/stats/win-rates');
    cy.wait('@civStats');
    // matchType is a row of buttons (1v1 / Team), not a <select>.
    cy.contains('button', /^Team$/).click();
    cy.get('[data-testid="url-search"]').invoke('attr', 'data-search').should('include', 'matchType=team');
  });

  it('changing the map filter writes ?map= to the router', () => {
    renderStats('/stats/win-rates');
    cy.wait('@civStats');
    cy.get('option[value="Arabia"]').should('exist');
    cy.get('select').eq(0).select('Arabia').should('have.value', 'Arabia');
    cy.get('[data-testid="url-search"]').invoke('attr', 'data-search').should('include', 'map=Arabia');
  });
});
