/// <reference types="cypress" />

import { mount } from '@cypress/react';
import { FilterBar } from './FilterBar';
import { CustomThemeProvider } from '../theme/ThemeProvider';
import { mockFilterBarProps } from '../test/mocks';

describe('FilterBar Responsive Layout', () => {
  it('should display all filter elements correctly on different screen sizes', () => {
    const props = {
      ...mockFilterBarProps,
      onMapChange: cy.stub().as('onMapChange'),
      onMatchTypeChange: cy.stub().as('onMatchTypeChange'),
      onSortChange: cy.stub().as('onSortChange')
    };

    mount(
      <CustomThemeProvider>
        <FilterBar {...props} />
      </CustomThemeProvider>
    );

    // Test mobile view
    cy.viewport(400, 600);
    cy.get('input[placeholder="Search matches..."]').should('be.visible');
    cy.get('select').should('have.length', 2);
    cy.get('button[aria-label*="Sort"]').should('be.visible');

    // Test desktop view
    cy.viewport(1200, 800);
    cy.get('input[placeholder="Search matches..."]').should('be.visible');
    cy.get('select').should('have.length', 2);
    cy.get('button[aria-label*="Sort"]').should('be.visible');
  });

  it('should NOT overflow horizontally on iPad Pro (1024px width)', () => {
    const props = {
      ...mockFilterBarProps,
      onMapChange: cy.stub().as('onMapChange'),
      onMatchTypeChange: cy.stub().as('onMatchTypeChange'),
      onSortChange: cy.stub().as('onSortChange')
    };

    mount(
      <CustomThemeProvider>
        <FilterBar {...props} />
      </CustomThemeProvider>
    );

    // Test iPad Pro viewport specifically
    cy.viewport(1024, 1366);

    // Wait for layout to settle
    cy.wait(50);

    // Check that FilterBar doesn't exceed viewport width
    cy.get('div').first().then($el => {
      const rect = $el[0].getBoundingClientRect();
      expect(rect.right).to.be.at.most(1024);
    });

    // Verify no horizontal scrollbar
    cy.window().then(win => {
      expect(win.document.documentElement.scrollWidth).to.be.at.most(1024);
    });

    // All filter elements should be visible
    cy.get('input[placeholder="Search matches..."]').should('be.visible');
    cy.get('select').should('have.length', 2);
    cy.get('button[aria-label*="Sort"]').should('be.visible');
  });

  it('should handle map selection correctly', () => {
    const props = {
      ...mockFilterBarProps,
      onMapChange: cy.stub().as('onMapChange'),
      onMatchTypeChange: cy.stub().as('onMatchTypeChange'),
      onSortChange: cy.stub().as('onSortChange')
    };

    mount(
      <CustomThemeProvider>
        <FilterBar {...props} />
      </CustomThemeProvider>
    );

    cy.get('select').first().select('Arabia');
    cy.get('@onMapChange').should('have.been.calledWith', 'Arabia');
  });

  it('should handle sort direction change correctly', () => {
    const props = {
      ...mockFilterBarProps,
      onMapChange: cy.stub().as('onMapChange'),
      onMatchTypeChange: cy.stub().as('onMatchTypeChange'),
      onSortChange: cy.stub().as('onSortChange')
    };

    mount(
      <CustomThemeProvider>
        <FilterBar {...props} />
      </CustomThemeProvider>
    );

    cy.get('button[aria-label*="Sort"]').click();
    cy.get('@onSortChange').should('have.been.calledWith', 'asc');
  });

  it('should display all options correctly', () => {
    const props = {
      ...mockFilterBarProps,
      onMapChange: cy.stub().as('onMapChange'),
      onMatchTypeChange: cy.stub().as('onMatchTypeChange'),
      onSortChange: cy.stub().as('onSortChange')
    };

    mount(
      <CustomThemeProvider>
        <FilterBar {...props} />
      </CustomThemeProvider>
    );

    // Map options
    cy.get('select').first().find('option').should('have.length', 4);
    cy.get('select').first().find('option').should('contain', 'Arabia (10)');
    cy.get('select').first().find('option').should('contain', 'Black Forest (5)');
    cy.get('select').first().find('option').should('contain', 'Arena (3)');

    // Match type options
    cy.get('select').last().find('option').should('have.length', 5);
    cy.get('select').last().find('option').should('contain', 'RM 1v1 (12)');
    cy.get('select').last().find('option').should('contain', 'RM Team (8)');
    cy.get('select').last().find('option').should('contain', 'EW 1v1 (4)');
    cy.get('select').last().find('option').should('contain', 'EW Team (2)');
  });

  it('should handle match type selection correctly', () => {
    const props = {
      ...mockFilterBarProps,
      onMapChange: cy.stub().as('onMapChange'),
      onMatchTypeChange: cy.stub().as('onMatchTypeChange'),
      onSortChange: cy.stub().as('onSortChange')
    };

    mount(
      <CustomThemeProvider>
        <FilterBar {...props} />
      </CustomThemeProvider>
    );

    cy.get('select').last().select('RM 1v1');
    cy.get('@onMatchTypeChange').should('have.been.calledWith', 'RM 1v1');
  });
}); 