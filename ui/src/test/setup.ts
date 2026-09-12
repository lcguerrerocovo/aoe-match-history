// This file is used to set up the testing environment.
// For example, you can import matchers for `toBeInTheDocument` here.
import '@testing-library/jest-dom/vitest';
import i18n from '../i18n';

// Unit and component tests assert on English copy.
i18n.changeLanguage('en');
