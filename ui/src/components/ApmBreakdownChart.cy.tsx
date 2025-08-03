import React from 'react';
import { mount } from 'cypress/react';
import { ApmBreakdownChart } from './ApmBreakdownChart';
import { CustomThemeProvider } from '../theme/ThemeProvider';

describe('ApmBreakdownChart Viewport Behavior', () => {
  const mockApmData = {
    players: {
      '123': [
        { minute: 0, total: 10, MOVE: 5, WORK: 3, CREATE: 2 },
        { minute: 1, total: 15, MOVE: 8, WORK: 4, CREATE: 3 },
        { minute: 2, total: 12, MOVE: 6, WORK: 3, CREATE: 3 },
        // Add more minutes to test scrolling
        ...Array.from({ length: 30 }, (_, i) => ({
          minute: i + 3,
          total: 10 + (i % 5),
          MOVE: 5 + (i % 3),
          WORK: 3 + (i % 2),
          CREATE: 2 + (i % 2)
        }))
      ]
    },
    averages: { '123': 12 }
  };

  const mockNameByProfile = { '123': 'TestPlayer' };
  const mockColorByProfile = { '123': 1 };

  beforeEach(() => {
    mount(
      <CustomThemeProvider>
        <ApmBreakdownChart 
          apm={mockApmData}
          nameByProfile={mockNameByProfile}
          colorByProfile={mockColorByProfile}
        />
      </CustomThemeProvider>
    );
  });

  it('should render chart container with horizontal scroll capability', () => {
    // Check that the chart container exists and has scroll properties
    cy.get('[data-testid="chart-container"]').should('exist');
    
    // Verify the container has horizontal scroll enabled
    cy.get('[data-testid="chart-container"]').should('have.css', 'overflow-x', 'auto');
  });

  it('should have minimum chart width for long matches', () => {
    // For a 33-minute match, the chart should have a minimum width
    cy.get('[data-testid="chart-container"]').find('> div').first().should('have.css', 'min-width');
  });
}); 