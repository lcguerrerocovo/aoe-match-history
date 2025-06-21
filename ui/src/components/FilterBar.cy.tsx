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
    cy.get('select').should('have.length', 2); // Map and sort selects
    cy.get('select').first().should('contain', 'All maps');
    cy.get('select').last().should('contain', 'Recent');

    // Test desktop view
    cy.viewport(1200, 800);
    cy.get('input[placeholder="Search matches..."]').should('be.visible');
    cy.get('select').should('have.length', 2);

    // Test iPad Pro view
    cy.viewport(1024,1366);
    cy.get('input[placeholder="Search matches..."]').should('be.visible');
  });

  it('should handle map selection correctly', () => {
    const props = {
      ...mockFilterBarProps,
      onMapChange: cy.stub().as('onMapChange'),
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
      onSortChange: cy.stub().as('onSortChange')
    };

    mount(
      <ChakraProvider theme={theme}>
        <FilterBar {...props} />
      </ChakraProvider>
    );

    cy.get('select').last().select('Oldest');
    cy.get('@onSortChange').should('have.been.calledWith', 'asc');
  });

  it('should display all map options correctly', () => {
    const props = {
      ...mockFilterBarProps,
      onMapChange: cy.stub().as('onMapChange'),
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
}); 