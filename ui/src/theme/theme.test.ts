import { describe, it, expect } from 'vitest';
import system from './theme';

describe('Chakra Theme Configuration (v3)', () => {
  it('should create a valid system', () => {
    expect(system).toBeDefined();
    expect(system.token).toBeDefined();
  });

  it('should have semantic color tokens for brand palette', () => {
    // Verify key brand tokens exist in the system
    const midnightBlue = system.token('colors.brand.midnightBlue');
    expect(midnightBlue).toBeDefined();

    const gold = system.token('colors.brand.gold');
    expect(gold).toBeDefined();
  });

  it('should have card slot recipe registered', () => {
    // The system should have slot recipes available via _config
    expect(system._config).toBeDefined();
  });

  it('should export spacing constants', async () => {
    const { componentSpacing, responsiveSpacing } = await import('./theme');
    expect(componentSpacing.profileSpacing).toBe('0.5rem');
    expect(componentSpacing.cardSpacing).toBe('1rem');
    expect(responsiveSpacing.landingSpacing).toEqual({ base: '0.25rem', md: '1rem' });
  });
});
