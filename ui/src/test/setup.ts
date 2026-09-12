// This file is used to set up the testing environment.
// For example, you can import matchers for `toBeInTheDocument` here.
import { beforeAll } from 'vitest';
import '@testing-library/jest-dom/vitest';
import i18n from '../i18n';

// Unit and component tests assert on English copy. Awaited rather than fired
// and forgotten — changeLanguage is async, and a test that renders before it
// settles would see raw keys instead of copy.
beforeAll(() => i18n.changeLanguage('en'));
