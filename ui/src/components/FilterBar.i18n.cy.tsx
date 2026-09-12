import { mount } from '@cypress/react';
import { FilterBar } from './FilterBar';
import { CustomThemeProvider } from '../theme/ThemeProvider';
import { mockFilterBarProps } from '../test/mocks';
import i18n from '../i18n';

describe('FilterBar in German', () => {
  afterEach(() => {
    // Restore the pinned test language for every other spec.
    i18n.changeLanguage('en');
  });

  it('renders German copy when the language is de', () => {
    i18n.changeLanguage('de');
    mount(
      <CustomThemeProvider>
        <FilterBar {...mockFilterBarProps} />
      </CustomThemeProvider>
    );

    cy.contains('Alle Karten').should('exist');
    cy.contains('Alle Typen').should('exist');
    cy.contains('All maps').should('not.exist');
  });
});
