/// <reference types="cypress" />
import i18n from '../../src/i18n';

// Component specs assert on English copy. Pin the language so a developer's
// browser locale can never change what the specs see.
before(() => {
  i18n.changeLanguage('en');
});
