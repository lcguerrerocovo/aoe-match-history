/// <reference types="cypress" />

import { mount } from '@cypress/react';
import { ChakraProvider } from '@chakra-ui/react';
import { BrowserRouter } from 'react-router-dom';
import { MatchCard, MatchList } from './MatchList';
import theme from '../theme/theme';
import { mockMatch, mockMatchGroup } from '../test/mocks';
import type { MatchGroup } from '../types/match';

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
    cy.get('[data-testid="match-card-content"]').should('have.css', 'flex-direction', 'column');

    // Test the desktop view
    cy.viewport(1200, 800);
    cy.get('[data-testid="match-card-content"]').should('have.css', 'flex-direction', 'row');

    // Test the iPad Pro view
    cy.viewport(1024, 1366);
    cy.get('[data-testid="match-card-content"]').should('have.css', 'flex-direction', 'row');
  });

  it('should NOT have horizontal overflow on iPad Pro (1024px width)', () => {
    mount(
      <BrowserRouter>
        <ChakraProvider theme={theme}>
          <MatchCard match={mockMatch} BASE_URL={BASE_URL} />
        </ChakraProvider>
      </BrowserRouter>
    );

    // Test iPad Pro viewport specifically
    cy.viewport(1024, 1366);

    // Wait for layout to settle
    cy.wait(100);

    // Check that the match card content doesn't exceed viewport width
    cy.get('[data-testid="match-card-content"]').then($el => {
      const element = $el[0];
      const rect = element.getBoundingClientRect();
      
      // Element should not extend beyond the viewport width
      expect(rect.right).to.be.lessThan(1024);
      
      // Element should not cause horizontal scrolling
      expect(rect.width).to.be.lessThan(1024);
    });

    // Verify no horizontal scrollbar on document
    cy.window().then(win => {
      expect(win.document.documentElement.scrollWidth).to.be.lessThan(1025);
    });
  });

  it('should contain all match elements within the viewport on iPad', () => {
    mount(
      <BrowserRouter>
        <ChakraProvider theme={theme}>
          <div style={{ width: '100%', border: '1px solid red' }}>
            <MatchCard match={mockMatch} BASE_URL={BASE_URL} />
          </div>
        </ChakraProvider>
      </BrowserRouter>
    );

    cy.viewport(1024, 1366);

    cy.get('[data-testid="match-card-content"]').each($el => {
      const rect = $el[0].getBoundingClientRect();
      expect(rect.right).to.be.at.most(1024);
      expect(rect.width).to.be.at.most(1024);
    });
  });
});

describe('Session Header Alignment', () => {
  const mockMatchGroups: MatchGroup[] = [mockMatchGroup];

  it('should align content correctly on desktop', () => {
    mount(
      <BrowserRouter>
        <ChakraProvider theme={theme}>
          <MatchList 
            matchGroups={mockMatchGroups} 
            openDates={['2024-01-01']} 
            onOpenDatesChange={() => {}} 
            profileId="123" 
          />
        </ChakraProvider>
      </BrowserRouter>
    );

    cy.viewport(1200, 800);

    // First verify the component is rendering
    cy.contains('Matches:').should('exist');
    
    // Check that the match stats row uses space-between alignment
    cy.get('h2').first().within(() => {
      // Look for any element with role="group"
      cy.get('[role="group"]').should('exist');
      cy.get('[role="group"]').first().should('have.css', 'justify-content', 'space-between');
    });
  });

  it('should handle mobile layout correctly', () => {
    mount(
      <BrowserRouter>
        <ChakraProvider theme={theme}>
          <MatchList 
            matchGroups={mockMatchGroups} 
            openDates={['2024-01-01']} 
            onOpenDatesChange={() => {}} 
            profileId="123" 
          />
        </ChakraProvider>
      </BrowserRouter>
    );

    cy.viewport(400, 600);

    // First verify the component is rendering
    cy.contains('Matches:').should('exist');
    
    // On mobile, the layout should still use space-between but wrap properly
    cy.get('h2').first().within(() => {
      // Look for any element with role="group"
      cy.get('[role="group"]').should('exist');
      cy.get('[role="group"]').first().should('have.css', 'justify-content', 'space-between');
    });
  });
}); 