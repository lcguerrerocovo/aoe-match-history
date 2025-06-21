import { describe, it, expect } from 'vitest';
import theme from './theme';

describe('Chakra Theme Configuration', () => {
  describe('Card Component Theme', () => {
    it('should correctly configure the "match" variant', () => {
      const cardTheme = theme.components.Card;
      const matchVariant = cardTheme.variants.match;
      const containerStyles = matchVariant.container;

      // Verify the specific styles within the 'container' part
      expect(containerStyles.backgroundColor).toBe('white');
      expect(containerStyles.borderColor).toBe('brand.stone');
      expect(containerStyles.borderRadius).toBe('lg');
    });

    it('should correctly configure the "summary" variant', () => {
      const cardTheme = theme.components.Card;
      const summaryVariant = cardTheme.variants.summary;
      const containerStyles = summaryVariant.container;

      // Verify the specific styles within the 'container' part
      expect(containerStyles.backgroundColor).toBe('brand.stone');
      expect(containerStyles.borderColor).toBe('brand.steel');
      expect(containerStyles.borderRadius).toBe('md');
    });
  });
}); 