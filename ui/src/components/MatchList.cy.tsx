/// <reference types="cypress" />

import { mount } from '@cypress/react';
import { BrowserRouter } from 'react-router-dom';
import { MatchCard, MatchList } from './MatchList';
import { CustomThemeProvider } from '../theme/ThemeProvider';
import { mockMatch, mockMatchGroup } from '../test/mocks';
import type { MatchGroup } from '../types/match';

// Helper function to create a match with multiple teams for testing team wrapping
const createMultiTeamMatch = (numTeams: number) => ({
  ...mockMatch,
  match_id: `multi-${numTeams}`,
  description: `${numTeams}v${numTeams}`,
  diplomacy: { type: `${numTeams}v${numTeams}`, team_size: numTeams.toString() },
  teams: Array.from({ length: numTeams }, (_, i) => [
    {
      name: `Player ${i + 1}`,
      civ: ['Britons', 'Franks', 'Goths', 'Huns', 'Mayans', 'Mongols'][i % 6],
      number: i + 1,
      color_id: i,
      user_id: (i + 1).toString(),
      winner: i === 0, // First team wins
      rating: 1200 + i * 10,
      rating_change: i === 0 ? 15 : -5,
    },
  ]),
  players: Array.from({ length: numTeams }, (_, i) => ({
    name: `Player ${i + 1}`,
    civ: ['Britons', 'Franks', 'Goths', 'Huns', 'Mayans', 'Mongols'][i % 6],
    number: i + 1,
    color_id: i,
    user_id: (i + 1).toString(),
    winner: i === 0,
    rating: 1200 + i * 10,
    rating_change: i === 0 ? 15 : -5,
  })),
  winning_team: 1,
  winning_teams: [1],
});

describe('Team Layout Responsive Behavior', () => {
  it('should display teams sequentially on mobile (no wrapping)', () => {
    const multiTeamMatch = createMultiTeamMatch(4);
    
    mount(
      <BrowserRouter>
        <CustomThemeProvider>
          <MatchCard match={multiTeamMatch} profileId="test" groupOpen={false} />
        </CustomThemeProvider>
      </BrowserRouter>
    );

    // Mobile viewport
    cy.viewport(400, 600);

    // Should have teams in a single column (no wrapping)
    cy.get('[data-testid="match-card-content"]').within(() => {
      // Find the team cards container
      cy.get('div').first().should('have.css', 'flex-direction', 'column');
      
      // Should have exactly 4 team cards
      cy.get('[data-testid="team-card"]').should('have.length', 4);
      
      // Each team card should take full width
      cy.get('[data-testid="team-card"]').each(($card) => {
        cy.wrap($card).should('have.css', 'max-width', '100%');
      });
    });
  });

  it('should wrap teams into rows of 2 on desktop', () => {
    const multiTeamMatch = createMultiTeamMatch(4);
    
    mount(
      <BrowserRouter>
        <CustomThemeProvider>
          <MatchCard match={multiTeamMatch} profileId="test" groupOpen={false} />
        </CustomThemeProvider>
      </BrowserRouter>
    );

    // Desktop viewport
    cy.viewport(1200, 800);

    // Should have teams wrapped in rows
    cy.get('[data-testid="match-card-content"]').within(() => {
      // Find the team cards container
      cy.get('div').first().should('have.css', 'flex-direction', 'column');
      
      // Should have 2 rows (4 teams / 2 per row)
      cy.get('[data-testid="team-row"]').should('have.length', 2);
      
      // Each row should have 2 teams
      cy.get('[data-testid="team-row"]').each(($row) => {
        cy.wrap($row).find('[data-testid="team-card"]').should('have.length', 2);
      });
      
      // Each team card should have max-width of 50%
      cy.get('[data-testid="team-card"]').each(($card) => {
        cy.wrap($card).should('have.css', 'max-width', '50%');
      });
    });
  });

  it('should handle odd number of teams correctly', () => {
    const multiTeamMatch = createMultiTeamMatch(3);
    
    mount(
      <BrowserRouter>
        <CustomThemeProvider>
          <MatchCard match={multiTeamMatch} profileId="test" groupOpen={false} />
        </CustomThemeProvider>
      </BrowserRouter>
    );

    // Desktop viewport
    cy.viewport(1200, 800);

    cy.get('[data-testid="match-card-content"]').within(() => {
      // Should have 2 rows (3 teams: first row with 2, second row with 1)
      cy.get('[data-testid="team-row"]').should('have.length', 2);
      
      // First row should have 2 teams
      cy.get('[data-testid="team-row"]').first().find('[data-testid="team-card"]').should('have.length', 2);
      
      // Second row should have 1 team
      cy.get('[data-testid="team-row"]').last().find('[data-testid="team-card"]').should('have.length', 1);
    });
  });

  it('should maintain proper spacing between team rows', () => {
    const multiTeamMatch = createMultiTeamMatch(4);
    
    mount(
      <BrowserRouter>
        <CustomThemeProvider>
          <MatchCard match={multiTeamMatch} profileId="test" groupOpen={false} />
        </CustomThemeProvider>
      </BrowserRouter>
    );

    // Desktop viewport
    cy.viewport(1200, 800);

    cy.get('[data-testid="match-card-content"]').within(() => {
      // Check that rows have proper gap
      cy.get('[data-testid="team-row"]').first().should('have.css', 'gap');
      
      // Check that teams within rows have proper gap
      cy.get('[data-testid="team-row"]').first().within(() => {
        cy.get('[data-testid="team-card"]').first().should('have.css', 'margin-right');
      });
    });
  });

  it('should display winner trophy correctly in wrapped layout', () => {
    const multiTeamMatch = createMultiTeamMatch(4);
    
    mount(
      <BrowserRouter>
        <CustomThemeProvider>
          <MatchCard match={multiTeamMatch} profileId="test" groupOpen={false} />
        </CustomThemeProvider>
      </BrowserRouter>
    );

    // Desktop viewport
    cy.viewport(1200, 800);

    cy.get('[data-testid="match-card-content"]').within(() => {
      // Should have exactly one winner trophy (first team wins)
      cy.get('[data-testid="team-card"]').should('have.length', 4);
      
      // Should have exactly one trophy
      cy.get('div').contains('🏆').should('exist');
      cy.get('div').contains('🏆').should('have.length', 1);
      
      // Trophy should be positioned correctly
      cy.get('div').contains('🏆').should('have.css', 'position', 'absolute');
      
      // Trophy should be in the first team card
      cy.get('[data-testid="team-card"]').first().should('contain', '🏆');
      
      // Other team cards should not have trophies
      cy.get('[data-testid="team-card"]').not(':first').each(($card) => {
        cy.wrap($card).should('not.contain', '🏆');
      });
    });
  });

  it('should handle 1v1 matches correctly (no wrapping needed)', () => {
    mount(
      <BrowserRouter>
        <CustomThemeProvider>
          <MatchCard match={mockMatch} profileId="test" groupOpen={false} />
        </CustomThemeProvider>
      </BrowserRouter>
    );

    // Desktop viewport
    cy.viewport(1200, 800);

    cy.get('[data-testid="match-card-content"]').within(() => {
      // For 1v1, should still use the wrapping logic but with only 2 teams
      cy.get('[data-testid="team-row"]').should('have.length', 1);
      cy.get('[data-testid="team-card"]').should('have.length', 2);
    });
  });

  it('should be responsive between mobile and desktop breakpoints', () => {
    const multiTeamMatch = createMultiTeamMatch(4);
    
    mount(
      <BrowserRouter>
        <CustomThemeProvider>
          <MatchCard match={multiTeamMatch} profileId="test" groupOpen={false} />
        </CustomThemeProvider>
      </BrowserRouter>
    );

    // Test mobile breakpoint
    cy.viewport(400, 600);
    cy.get('[data-testid="match-card-content"]').within(() => {
      cy.get('div').first().should('have.css', 'flex-direction', 'column');
    });

    // Test desktop breakpoint
    cy.viewport(1200, 800);
    cy.get('[data-testid="match-card-content"]').within(() => {
      cy.get('div').first().should('have.css', 'flex-direction', 'column');
      cy.get('[data-testid="team-row"]').should('exist');
    });
  });
});

describe('MatchCard Responsive Layout', () => {
  it('should stack vertically on mobile and horizontally on desktop', () => {
    mount(
      <BrowserRouter>
        <CustomThemeProvider>
          <MatchCard match={mockMatch} profileId="test" groupOpen={false} />
        </CustomThemeProvider>
      </BrowserRouter>
    );

    // Test the mobile view
    cy.viewport(400, 600);
    cy.get('[data-testid="match-card-content"]').should('have.css', 'flex-direction', 'column');

    // Test the desktop view
    cy.viewport(1200, 800);
    cy.get('[data-testid="match-card-content"]').should('have.css', 'flex-direction', 'row');
  });

  it('should NOT have horizontal overflow on iPad Pro (1024px width)', () => {
    mount(
      <BrowserRouter>
        <CustomThemeProvider>
          <MatchCard match={mockMatch} profileId="test" groupOpen={false} />
        </CustomThemeProvider>
      </BrowserRouter>
    );

    // Test iPad Pro viewport specifically
    cy.viewport(1024, 1366);

    // Wait for layout to settle
    cy.wait(50);

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
        <CustomThemeProvider>
          <div style={{ width: '100%', border: '1px solid red' }}>
            <MatchCard match={mockMatch} profileId="test" groupOpen={false} />
          </div>
        </CustomThemeProvider>
      </BrowserRouter>
    );

    cy.viewport(1024, 1366);

    cy.get('[data-testid="match-card-content"]').first().then($el => {
      const rect = $el[0].getBoundingClientRect();
      expect(rect.right).to.be.at.most(1024);
    });
  });
});

describe('Session Header Alignment', () => {
  const mockMatchGroups: MatchGroup[] = [mockMatchGroup];

  it('should align content correctly on desktop', () => {
    mount(
      <BrowserRouter>
        <CustomThemeProvider>
          <MatchList 
            matchGroups={mockMatchGroups} 
            openDates={['2024-01-01']} 
            onOpenDatesChange={() => {}} 
            profileId="123" 
          />
        </CustomThemeProvider>
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
        <CustomThemeProvider>
          <MatchList 
            matchGroups={mockMatchGroups} 
            openDates={['2024-01-01']} 
            onOpenDatesChange={() => {}} 
            profileId="123" 
          />
        </CustomThemeProvider>
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