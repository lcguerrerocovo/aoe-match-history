/// <reference types="cypress" />
import i18n from '../../src/i18n';

// Component specs assert on English copy. Pin the language so a developer's
// browser locale can never change what the specs see.
//
// The promise is returned, not fired and forgotten: changeLanguage is async,
// and without awaiting it the first spec can mount before translations are
// ready. That is invisible on a fast machine and intermittent on CI.
before(() => i18n.changeLanguage('en'));
