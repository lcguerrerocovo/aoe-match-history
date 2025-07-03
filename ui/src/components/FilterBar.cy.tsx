/// <reference types="cypress" />

import { mount } from '@cypress/react';
import { ChakraProvider } from '@chakra-ui/react';
import { FilterBar } from './FilterBar';
import theme from '../theme/theme';
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
      <ChakraProvider theme={theme}>
        <FilterBar {...props} />
      </ChakraProvider>
    );

    // Test mobile view
    cy.viewport(400, 600);
    cy.get('input[placeholder="Search matches..."]').should('be.visible');
    cy.get('select').should('have.length', 2); // Map and match type selects
    cy.get('select').first().should('contain', 'All maps');
    cy.get('select').last().should('contain', 'All types');
    cy.get('button[aria-label*="Sort"]').should('be.visible'); // Sort button

    // Test desktop view
    cy.viewport(1200, 800);
    cy.get('input[placeholder="Search matches..."]').should('be.visible');
    cy.get('select').should('have.length', 2);
    cy.get('button[aria-label*="Sort"]').should('be.visible');

    // Test iPad Pro view
    cy.viewport(1024,1366);
    cy.get('input[placeholder="Search matches..."]').should('be.visible');
  });

  it('should NOT overflow horizontally on iPad Pro (1024px width)', () => {
    const props = {
      ...mockFilterBarProps,
      onMapChange: cy.stub().as('onMapChange'),
      onMatchTypeChange: cy.stub().as('onMatchTypeChange'),
      onSortChange: cy.stub().as('onSortChange')
    };

    mount(
      <ChakraProvider theme={theme}>
        <FilterBar {...props} />
      </ChakraProvider>
    );

    // Test iPad Pro viewport specifically
    cy.viewport(1024, 1366);

    // Wait for layout to settle
    cy.wait(100);

    // Check that FilterBar doesn't exceed viewport width
    cy.get('div').first().then($el => {
      const element = $el[0];
      const rect = element.getBoundingClientRect();
      
      // Element should not extend beyond the viewport width (allow exact fit)
      expect(rect.right).to.be.at.most(1024);
      expect(rect.width).to.be.at.most(1024);
    });

    // Verify no horizontal scrollbar
    cy.window().then(win => {
      expect(win.document.documentElement.scrollWidth).to.be.at.most(1024);
    });

    // All filter elements should be contained
    cy.get('input[placeholder="Search matches..."]').should('be.visible');
    cy.get('select').should('have.length', 2);
    cy.get('select').each($select => {
      const rect = $select[0].getBoundingClientRect();
      expect(rect.right).to.be.at.most(1024);
    });
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
      <ChakraProvider theme={theme}>
        <FilterBar {...props} />
      </ChakraProvider>
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
      <ChakraProvider theme={theme}>
        <FilterBar {...props} />
      </ChakraProvider>
    );

    cy.get('button[aria-label*="Sort"]').click();
    cy.get('@onSortChange').should('have.been.calledWith', 'asc');
  });

  it('should display all map options correctly', () => {
    const props = {
      ...mockFilterBarProps,
      onMapChange: cy.stub().as('onMapChange'),
      onMatchTypeChange: cy.stub().as('onMatchTypeChange'),
      onSortChange: cy.stub().as('onSortChange')
    };

    mount(
      <ChakraProvider theme={theme}>
        <FilterBar {...props} />
      </ChakraProvider>
    );

    cy.get('select').first().find('option').should('have.length', 4); // "All maps" + 3 mock maps
    cy.get('select').first().find('option').should('contain', 'Arabia (10)');
    cy.get('select').first().find('option').should('contain', 'Black Forest (5)');
    cy.get('select').first().find('option').should('contain', 'Arena (3)');
  });

  it('should display all match type options correctly', () => {
    const props = {
      ...mockFilterBarProps,
      onMapChange: cy.stub().as('onMapChange'),
      onMatchTypeChange: cy.stub().as('onMatchTypeChange'),
      onSortChange: cy.stub().as('onSortChange')
    };

    mount(
      <ChakraProvider theme={theme}>
        <FilterBar {...props} />
      </ChakraProvider>
    );

    cy.get('select').last().find('option').should('have.length', 5); // "All types" + 4 mock match types
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
      <ChakraProvider theme={theme}>
        <FilterBar {...props} />
      </ChakraProvider>
    );

    cy.get('select').last().select('RM 1v1');
    cy.get('@onMatchTypeChange').should('have.been.calledWith', 'RM 1v1');
  });
}); 