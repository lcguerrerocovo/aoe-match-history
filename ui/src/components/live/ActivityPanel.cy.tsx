/// <reference types="cypress" />

import React from 'react';
import { mount } from '@cypress/react';
import { MemoryRouter } from 'react-router-dom';
import { CustomThemeProvider } from '../../theme/ThemeProvider';
import { ActivityPanel, getMatchAvgRating } from './ActivityPanel';
import { mockLiveMatches } from '../../test/mocks';

function buildAvgRatings(matches: typeof mockLiveMatches) {
  const map = new Map<number, number | null>();
  for (const m of matches) map.set(m.match_id, getMatchAvgRating(m));
  return map;
}

const mountWithProviders = (children: React.ReactNode) => {
  mount(
    <MemoryRouter>
      <CustomThemeProvider>{children}</CustomThemeProvider>
    </MemoryRouter>
  );
};

describe('ActivityPanel', () => {
  const defaultProps = {
    matches: mockLiveMatches,
    avgRatings: buildAvgRatings(mockLiveMatches),
    selectedMap: '',
    selectedEloBracket: '',
    onMapSelect: () => {},
    onEloBracketSelect: () => {},
  };

  it('renders match and player counts', () => {
    mountWithProviders(<ActivityPanel {...defaultProps} />);
    cy.contains(`${mockLiveMatches.length}`).should('be.visible');
    const totalPlayers = mockLiveMatches.reduce((sum, m) => sum + m.players.length, 0);
    cy.contains(`${totalPlayers}`).should('be.visible');
    cy.contains('matches').should('be.visible');
    cy.contains('players').should('be.visible');
  });

  it('shows Top Maps section with map names', () => {
    mountWithProviders(<ActivityPanel {...defaultProps} />);
    cy.contains('Top Maps').should('be.visible');
    cy.contains('Arabia').should('be.visible');
  });

  it('shows "Other" row when more than 5 unique maps exist', () => {
    // mockLiveMatches has 7 unique maps (Arabia, Arena, Black Forest, Nomad, Islands, Hideout, MegaRandom)
    mountWithProviders(<ActivityPanel {...defaultProps} />);
    cy.contains('Other').should('be.visible');
  });

  it('shows ELO Distribution section', () => {
    mountWithProviders(<ActivityPanel {...defaultProps} />);
    cy.contains('ELO Distribution').should('be.visible');
  });

  it('shows Match Age freshness section', () => {
    mountWithProviders(<ActivityPanel {...defaultProps} />);
    cy.contains('Match Age').should('be.visible');
    cy.contains('<5 min').should('be.visible');
  });

  it('calls onMapSelect when clicking a map bar', () => {
    const onMapSelect = cy.stub().as('mapSelect');
    mountWithProviders(<ActivityPanel {...defaultProps} onMapSelect={onMapSelect} />);
    cy.contains('Arabia').click();
    cy.get('@mapSelect').should('have.been.calledWith', 'Arabia');
  });

  it('calls onMapSelect with empty string to deselect', () => {
    const onMapSelect = cy.stub().as('mapSelect');
    mountWithProviders(
      <ActivityPanel {...defaultProps} selectedMap="Arabia" onMapSelect={onMapSelect} />
    );
    cy.contains('Arabia').click();
    cy.get('@mapSelect').should('have.been.calledWith', '');
  });

  it('calls onEloBracketSelect when clicking an ELO column', () => {
    const onEloBracketSelect = cy.stub().as('eloSelect');
    mountWithProviders(
      <ActivityPanel {...defaultProps} onEloBracketSelect={onEloBracketSelect} />
    );
    // Click a bracket abbreviation label (e.g. "1.2–1.4")
    cy.contains('1.2').click();
    cy.get('@eloSelect').should('have.been.called');
  });

  it('shows "Clear filters" when a filter is active', () => {
    mountWithProviders(<ActivityPanel {...defaultProps} selectedMap="Arabia" />);
    cy.contains('Clear filters').should('be.visible');
  });

  it('does not show "Clear filters" when no filters active', () => {
    mountWithProviders(<ActivityPanel {...defaultProps} />);
    cy.contains('Clear filters').should('not.exist');
  });

  it('returns null when no matches provided', () => {
    mountWithProviders(<ActivityPanel {...defaultProps} matches={[]} />);
    cy.contains('Top Maps').should('not.exist');
  });

  describe('responsive layout', () => {
    it('stacks ELO and freshness vertically on mobile', () => {
      cy.viewport(390, 844);
      mountWithProviders(<ActivityPanel {...defaultProps} />);
      cy.contains('ELO Distribution').should('be.visible');
      cy.contains('Match Age').should('be.visible');
    });
  });
});
