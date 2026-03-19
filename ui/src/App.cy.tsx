/// <reference types="cypress" />

import { mount } from '@cypress/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import App from './App';
import { CustomThemeProvider } from './theme/ThemeProvider';

describe('App Responsive Layout', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/match-history/*', { statusCode: 200, body: { matches: [], name: 'TestPlayer' } });
    cy.intercept('GET', '**/personal-stats/*', { statusCode: 200, body: { statGroups: [], leaderboardStats: [] } });
  });

  const renderApp = () => {
    mount(
      <MemoryRouter initialEntries={['/profile_id/12345']}>
        <CustomThemeProvider>
          <Routes>
            <Route path="/profile_id/:profileId" element={<App />} />
          </Routes>
        </CustomThemeProvider>
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

  it('should display a parchment background on all screen sizes', () => {
    renderApp();

    // Test mobile view
    cy.viewport(400, 600);
    cy.get('body').should('have.css', 'background-color', 'rgb(248, 243, 230)'); // parchment
    cy.get('[data-testid="floating-box-container"]').should('have.css', 'background-color', 'rgb(248, 243, 230)'); // parchment

    // Test desktop view — body is now parchment everywhere (unified manuscript feel)
    cy.viewport(1400, 900);
    cy.get('body').should('have.css', 'background-color', 'rgb(248, 243, 230)'); // parchment
    cy.get('[data-testid="floating-box-container"]').should('have.css', 'background-color', 'rgb(248, 243, 230)'); // parchment
  });
}); 