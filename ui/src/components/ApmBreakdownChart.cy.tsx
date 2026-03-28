import { mount } from 'cypress/react';
import { ApmBreakdownChart } from './ApmBreakdownChart';
import { ChartViewport } from './Analysis/ChartViewport';
import { CustomThemeProvider } from '../theme/ThemeProvider';

describe('ApmBreakdownChart Viewport Behavior', () => {
  const mockApmData = {
    players: {
      '123': [
        { minute: 0, total: 10, MOVE: 5, WORK: 3, CREATE: 2 },
        { minute: 1, total: 15, MOVE: 8, WORK: 4, CREATE: 3 },
        { minute: 2, total: 12, MOVE: 6, WORK: 3, CREATE: 3 },
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

  const allTypes = new Set(['MOVE', 'WORK', 'CREATE']);
  const colorMap = { MOVE: 0, WORK: 1, CREATE: 2 };

  beforeEach(() => {
    mount(
      <CustomThemeProvider>
        <ChartViewport dataPointCount={33}>
          <ApmBreakdownChart
            apm={mockApmData}
            selectedPlayerId="123"
            activeActionTypes={allTypes}
            actionTypeColorMap={colorMap}
          />
        </ChartViewport>
      </CustomThemeProvider>
    );
  });

  it('should render chart container with horizontal scroll capability', () => {
    cy.get('[data-testid="chart-container"]').should('exist');
    cy.get('[data-testid="chart-container"]').should('have.css', 'overflow-x', 'auto');
  });

  it('should have minimum chart width for long matches', () => {
    cy.get('[data-testid="chart-container"]').find('> div').first().should('have.css', 'min-width');
  });
});
