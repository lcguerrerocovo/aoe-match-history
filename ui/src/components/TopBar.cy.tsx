import React from 'react';
import { mount } from '@cypress/react';
import { MemoryRouter } from 'react-router-dom';
import { CustomThemeProvider } from '../theme/ThemeProvider';
import TopBar from './TopBar';

const mountWithChakra = (children: React.ReactNode) => {
  mount(
    <MemoryRouter>
      <CustomThemeProvider>{children}</CustomThemeProvider>
    </MemoryRouter>
  );
};

describe('TopBar responsiveness', () => {
  it('renders correctly on desktop', () => {
    cy.viewport(1280, 800);
    mountWithChakra(<TopBar />);
    cy.get('[data-testid="topbar-root"]').should('be.visible');
    cy.get('[data-testid="topbar-root"]').should('have.css', 'background-image').and('include', 'linear-gradient');
    cy.get('[data-testid="topbar-root"]').should('have.css', 'border-bottom');
  });

  it('renders correctly on mobile', () => {
    cy.viewport(375, 667);
    mountWithChakra(<TopBar />);
    cy.get('[data-testid="topbar-root"]').should('be.visible');
    cy.get('[data-testid="topbar-root"]').should('have.css', 'background-image').and('include', 'linear-gradient');
    cy.get('[data-testid="topbar-root"]').should('have.css', 'border-bottom');
  });

  it('adapts layout between mobile and desktop', () => {
    cy.viewport(375, 667);
    mountWithChakra(<TopBar />);
    cy.get('[data-testid="topbar-root"]').invoke('css', 'border-radius').should('eq', '0px');
    cy.viewport(1280, 800);
    cy.get('[data-testid="topbar-root"]').invoke('css', 'border-radius').should('eq', '0px 0px 12px 12px');
  });
}); 