import { describe, it, expect } from 'vitest';
import theme from './theme';

describe('Chakra Theme Configuration', () => {
  describe('Card Component Theme', () => {
    it('should correctly configure the static styles for the "match" variant container', () => {
      const cardTheme = theme.components.Card;
      const matchVariant = cardTheme.variants.match;
      const containerStyles = matchVariant.container;

      // This is a valuable test. It confirms that the outer card will always
      // stack its children vertically, which is the behavior we want.
      expect(containerStyles.flexDirection).toBe('column');
      expect(containerStyles.backgroundColor).toBe('white');
      expect(containerStyles.borderRadius).toBe('lg');
    });

    it('should correctly configure the visual styles for the "summary" variant', () => {
      const cardTheme = theme.components.Card;
      const summaryVariant = cardTheme.variants.summary;
      const containerStyles = summaryVariant.container;

      expect(containerStyles.bg).toBe('gray.50');
      expect(containerStyles.borderRadius).toBe('md');
    });
  });
}); 