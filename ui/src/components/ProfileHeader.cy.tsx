/// <reference types="cypress" />

import { mount } from '@cypress/react';
import { ChakraProvider } from '@chakra-ui/react';
import { ProfileHeader } from './ProfileHeader';
import theme from '../theme/theme';
import { mockProfileHeaderProps } from '../test/mocks';

describe('ProfileHeader Responsive Layout', () => {
  it('should display profile information correctly on different screen sizes', () => {
    mount(
      <ChakraProvider theme={theme}>
        <ProfileHeader {...mockProfileHeaderProps} />
      </ChakraProvider>
    );

    // Test mobile view
    cy.viewport(400, 600);
    cy.contains('TestPlayer').should('be.visible');
    cy.contains('ID: 12345').should('be.visible');
    cy.get('table').should('have.length', 2); // Two tables: ratings and stats

    // Test desktop view
    cy.viewport(1200, 800);
    cy.contains('TestPlayer').should('be.visible');
    cy.contains('ID: 12345').should('be.visible');
    cy.get('table').should('have.length', 2);
  });

  it('should display leaderboard stats correctly', () => {
    mount(
      <ChakraProvider theme={theme}>
        <ProfileHeader {...mockProfileHeaderProps} />
      </ChakraProvider>
    );

    // Check first table (ratings)
    cy.get('table').first().within(() => {
      cy.contains('RM 1v1').should('be.visible');
      cy.contains('1200').should('be.visible');
      cy.contains('1250').should('be.visible');
      cy.contains('-50').should('be.visible'); // Rating difference
    });

    // Check second table (stats)
    cy.get('table').last().within(() => {
      cy.contains('RM 1v1').should('be.visible');
      cy.contains('80').should('be.visible'); // Total games (45 + 35)
      cy.contains('56.25%').should('be.visible'); // Win rate
      cy.contains('+3').should('be.visible'); // Streak
    });
  });

  it('should handle loading state correctly', () => {
    const loadingProps = {
      ...mockProfileHeaderProps,
      profile: null,
      stats: null,
      isLoading: true
    };

    mount(
      <ChakraProvider theme={theme}>
        <ProfileHeader {...loadingProps} />
      </ChakraProvider>
    );

    cy.contains('Loading...').should('be.visible');
    cy.contains('ID: 12345').should('be.visible');
  });

  it('should handle missing profile data correctly', () => {
    const noProfileProps = {
      ...mockProfileHeaderProps,
      profile: null,
      isLoading: false
    };

    mount(
      <ChakraProvider theme={theme}>
        <ProfileHeader {...noProfileProps} />
      </ChakraProvider>
    );

    cy.contains('12345').should('be.visible'); // Should show profileId as name
    cy.contains('ID: 12345').should('be.visible');
  });

  it('should display avatar placeholder when no avatar URL', () => {
    mount(
      <ChakraProvider theme={theme}>
        <ProfileHeader {...mockProfileHeaderProps} />
      </ChakraProvider>
    );

    // Should show user icon placeholder (the only SVG in the component)
    cy.get('svg').should('exist');
  });

  it('should handle responsive positioning correctly', () => {
    mount(
      <ChakraProvider theme={theme}>
        <ProfileHeader {...mockProfileHeaderProps} />
      </ChakraProvider>
    );

    cy.viewport(400, 600);
    cy.get('div').first().should('have.css', 'position', 'static');

    cy.viewport(1200, 800);
    cy.get('div').first().should('have.css', 'position', 'static');
  });
}); 