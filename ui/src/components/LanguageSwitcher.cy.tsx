import { mount } from '@cypress/react';
import { LanguageSwitcher } from './LanguageSwitcher';
import { CustomThemeProvider } from '../theme/ThemeProvider';
import i18n from '../i18n';

function mountSwitcher() {
  mount(
    <CustomThemeProvider>
      <LanguageSwitcher />
    </CustomThemeProvider>
  );
}

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    cy.window().then(w => w.localStorage.clear());
    i18n.changeLanguage('en');
  });

  afterEach(() => {
    // Restore the pinned test language for every other spec.
    i18n.changeLanguage('en');
  });

  it('shows the active language code', () => {
    mountSwitcher();
    cy.get('[data-testid="language-switcher"]').should('contain.text', 'EN');
  });

  it('lists every language in its native name', () => {
    mountSwitcher();
    cy.get('[data-testid="language-switcher"] button').first().click();
    ['English', 'Español', 'Deutsch', 'Italiano', 'Português', '中文'].forEach(name => {
      cy.contains(name).should('be.visible');
    });
  });

  it('switches language, persists it, and updates html lang', () => {
    mountSwitcher();
    cy.get('[data-testid="language-switcher"] button').first().click();
    cy.get('[data-lang="de"]').click();

    cy.get('[data-testid="language-switcher"]').should('contain.text', 'DE');
    cy.window().its('localStorage').invoke('getItem', 'i18nextLng').should('eq', 'de');
    cy.document().its('documentElement.lang').should('eq', 'de');
  });
});
