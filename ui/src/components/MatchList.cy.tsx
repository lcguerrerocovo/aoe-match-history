/// <reference types="cypress" />

import { mount } from '@cypress/react';
import { ChakraProvider } from '@chakra-ui/react';
import { BrowserRouter } from 'react-router-dom';
import { MatchCard } from './MatchList';
import theme from '../theme/theme';
import { mockMatch } from '../test/mocks';

const BASE_URL = 'http://localhost';

describe('MatchCard Responsive Layout', () => {
  it('should stack vertically on mobile and horizontally on desktop', () => {
    mount(
      <BrowserRouter>
        <ChakraProvider theme={theme}>
          <MatchCard match={mockMatch} BASE_URL={BASE_URL} />
        </ChakraProvider>
      </BrowserRouter>
    );

    // Test the mobile view
    cy.viewport(400, 600);
    cy.get('[role="group"]').should('have.css', 'flex-direction', 'column');

    // Test the desktop view
    cy.viewport(1200, 800);
    cy.get('[role="group"]').should('have.css', 'flex-direction', 'row');
  });
}); 