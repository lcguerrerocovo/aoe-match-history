/// <reference types="cypress" />

import { mount } from '@cypress/react';
import { ChakraProvider } from '@chakra-ui/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import App from './App';
import theme from './theme/theme';

describe('App Responsive Layout', () => {
  const renderApp = () => {
    mount(
      <MemoryRouter initialEntries={['/profile_id/12345']}>
        <ChakraProvider theme={theme}>
          <Routes>
            <Route path="/profile_id/:profileId" element={<App />} />
          </Routes>
        </ChakraProvider>
      </MemoryRouter>
    );
  };

  it('should stack ProfileHeader vertically on mobile and horizontally on desktop/tablet', () => {
    renderApp();

    // Test mobile view
    cy.viewport(400, 600);
    cy.get('[data-testid="profile-header-stack"]').should('have.css', 'flex-direction', 'column');

    // Test tablet view (iPad Pro)
    cy.viewport(1024, 1366);
    cy.get('[data-testid="profile-header-stack"]').should('have.css', 'flex-direction', 'row');

    // Test desktop view
    cy.viewport(1400, 900);
    cy.get('[data-testid="profile-header-stack"]').should('have.css', 'flex-direction', 'row');
  });

  it('should display a floating box with a dark background on desktop/tablet but not on mobile', () => {
    renderApp();

    // Test mobile view
    cy.viewport(400, 600);
    cy.get('[data-testid="floating-box-container"]').should('not.have.css', 'background-color', 'rgb(25, 33, 78)'); // midnightBlue
    cy.get('body').should('not.have.css', 'background-color', 'rgb(25, 33, 78)');

    // Test desktop view
    cy.viewport(1400, 900);
    cy.get('body').should('have.css', 'background-color', 'rgb(25, 33, 78)');
    cy.get('[data-testid="floating-box-container"]').should('have.css', 'background-color', 'rgb(248, 243, 230)'); // parchment
    cy.get('[data-testid="floating-box-container"]').should('have.css', 'border-color', 'rgb(212, 175, 55)'); // gold
  });
}); 