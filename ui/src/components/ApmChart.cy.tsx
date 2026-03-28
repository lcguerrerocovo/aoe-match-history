import { mount } from 'cypress/react';
import { ApmChart } from './ApmChart';
import { ChartViewport } from './Analysis/ChartViewport';
import { CustomThemeProvider } from '../theme/ThemeProvider';

describe('ApmChart Viewport Behavior', () => {
  const mockApmData = {
    players: {
      '123': [
        { minute: 0, total: 10 },
        { minute: 1, total: 15 },
        { minute: 2, total: 12 },
        // Add more minutes to test scrolling
        ...Array.from({ length: 30 }, (_, i) => ({
          minute: i + 3,
          total: 10 + (i % 5)
        }))
      ],
      '456': [
        { minute: 0, total: 8 },
        { minute: 1, total: 12 },
        { minute: 2, total: 9 },
        // Add more minutes to test scrolling
        ...Array.from({ length: 30 }, (_, i) => ({
          minute: i + 3,
          total: 8 + (i % 4)
        }))
      ]
    },
    averages: { '123': 12, '456': 10 }
  };

  const mockNameByProfile = { '123': 'Player1', '456': 'Player2' };
  const mockColorByProfile = { '123': 1, '456': 2 };

  beforeEach(() => {
    mount(
      <CustomThemeProvider>
        <ChartViewport dataPointCount={33}>
          <ApmChart
            apm={mockApmData}
            nameByProfile={mockNameByProfile}
            colorByProfile={mockColorByProfile}
          />
        </ChartViewport>
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