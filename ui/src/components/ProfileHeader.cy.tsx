/// <reference types="cypress" />

import { mount } from '@cypress/react';
import { ProfileHeader } from './ProfileHeader';
import { CustomThemeProvider } from '../theme/ThemeProvider';
import { mockProfileHeaderProps } from '../test/mocks';

describe('ProfileHeader Responsive Layout', () => {
  it('should display profile information correctly on different screen sizes', () => {
    mount(
      <CustomThemeProvider>
        <ProfileHeader {...mockProfileHeaderProps} />
      </CustomThemeProvider>
    );

    // Test mobile view
    cy.viewport(400, 600);
    cy.contains('TestPlayer').should('be.visible');
    cy.contains('ID: 12345').should('be.visible');
    cy.get('table').should('have.length', 1); // One table: combined stats

    // Test desktop view
    cy.viewport(1200, 800);
    cy.contains('TestPlayer').should('be.visible');
    cy.contains('ID: 12345').should('be.visible');
    cy.get('table').should('have.length', 1);

    // iPad Pro
    cy.viewport(1024,1366);
    cy.contains('TestPlayer').should('be.visible');
    cy.get('table').should('have.length', 1);
  });

  it('should display leaderboard stats correctly', () => {
    mount(
      <CustomThemeProvider>
        <ProfileHeader {...mockProfileHeaderProps} />
      </CustomThemeProvider>
    );

    // Check the combined stats table
    cy.get('table').within(() => {
      cy.contains('RM 1v1').should('be.visible');
      cy.contains('1200').should('be.visible'); // Rating
      cy.contains('1250').should('be.visible'); // Max rating
      cy.contains('-50').should('be.visible'); // Rating difference
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
      <CustomThemeProvider>
        <ProfileHeader {...loadingProps} />
      </CustomThemeProvider>
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
      <CustomThemeProvider>
        <ProfileHeader {...noProfileProps} />
      </CustomThemeProvider>
    );

    cy.contains('12345').should('be.visible'); // Should show profileId as name
    cy.contains('ID: 12345').should('be.visible');
  });

  it('should display avatar placeholder when no avatar URL', () => {
    mount(
      <CustomThemeProvider>
        <ProfileHeader {...mockProfileHeaderProps} />
      </CustomThemeProvider>
    );

    // Should show user icon placeholder (the only SVG in the component)
    cy.get('svg').should('exist');
  });
}); 