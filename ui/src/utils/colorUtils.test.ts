import { 
  hexToRgb, 
  getLuminance, 
  getContrastRatio, 
  getOptimalTextColor, 
  getTextShadow,
  computeIsLight,
  getTextColorForBackground,
  getTextShadowForBackground
} from './colorUtils';

describe('colorUtils', () => {
  describe('hexToRgb', () => {
    it('should convert 6-character hex to RGB', () => {
      expect(hexToRgb('#FF0000')).toEqual([255, 0, 0]);
      expect(hexToRgb('#00FF00')).toEqual([0, 255, 0]);
      expect(hexToRgb('#0000FF')).toEqual([0, 0, 255]);
      expect(hexToRgb('#FFFFFF')).toEqual([255, 255, 255]);
      expect(hexToRgb('#000000')).toEqual([0, 0, 0]);
    });

    it('should convert 3-character hex to RGB', () => {
      expect(hexToRgb('#F00')).toEqual([255, 0, 0]);
      expect(hexToRgb('#0F0')).toEqual([0, 255, 0]);
      expect(hexToRgb('#00F')).toEqual([0, 0, 255]);
      expect(hexToRgb('#FFF')).toEqual([255, 255, 255]);
      expect(hexToRgb('#000')).toEqual([0, 0, 0]);
    });

    it('should handle hex without #', () => {
      expect(hexToRgb('FF0000')).toEqual([255, 0, 0]);
      expect(hexToRgb('F00')).toEqual([255, 0, 0]);
    });
  });

  describe('getLuminance', () => {
    it('should calculate luminance correctly', () => {
      // White should have highest luminance
      expect(getLuminance(255, 255, 255)).toBeCloseTo(1, 3);
      
      // Black should have lowest luminance
      expect(getLuminance(0, 0, 0)).toBeCloseTo(0, 3);
      
      // Gray should be in between
      expect(getLuminance(128, 128, 128)).toBeCloseTo(0.216, 3);
    });
  });

  describe('getContrastRatio', () => {
    it('should calculate contrast ratio correctly', () => {
      // White on black should have maximum contrast
      expect(getContrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 1);
      
      // Black on white should have maximum contrast
      expect(getContrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
      
      // Same color should have minimum contrast
      expect(getContrastRatio('#FF0000', '#FF0000')).toBeCloseTo(1, 1);
    });

    it('should handle 3-character hex codes', () => {
      expect(getContrastRatio('#FFF', '#000')).toBeCloseTo(21, 1);
      expect(getContrastRatio('#000', '#FFF')).toBeCloseTo(21, 1);
    });
  });

  describe('getOptimalTextColor', () => {
    it('should choose white text for dark backgrounds', () => {
      expect(getOptimalTextColor('#000000')).toBe('white');
      expect(getOptimalTextColor('#0000FF')).toBe('white'); // Blue
      expect(getOptimalTextColor('#008000')).toBe('white'); // Green
    });

    it('should choose black text for light backgrounds', () => {
      expect(getOptimalTextColor('#FFFFFF')).toBe('black');
      expect(getOptimalTextColor('#F2F0EA')).toBe('black'); // Light beige
      expect(getOptimalTextColor('#FFFF00')).toBe('black'); // Yellow
    });

    it('should handle edge cases', () => {
      // Test with custom white/black colors
      expect(getOptimalTextColor('#000000', '#fff', '#111')).toBe('white');
      expect(getOptimalTextColor('#FFFFFF', '#fff', '#111')).toBe('black');
    });

    it('should choose the color with higher contrast ratio', () => {
      // Red background: white contrast ~4.0, black contrast ~4.72
      // Should choose black since it has higher contrast
      const result = getOptimalTextColor('#FF0000');
      expect(result).toBe('black');
    });
  });

  describe('getTextShadow', () => {
    it('should return no shadow for high contrast', () => {
      expect(getTextShadow('#000000', 'white')).toBe('none');
      expect(getTextShadow('#FFFFFF', 'black')).toBe('none');
    });

    it('should return light shadow for moderate contrast', () => {
      const shadow = getTextShadow('#FF0000', 'white');
      expect(shadow).toContain('rgba(0,0,0,0.6)');
      expect(shadow).toContain('0 1px 2px');
    });

    it('should return medium shadow for low contrast', () => {
      // Create a low contrast scenario
      const shadow = getTextShadow('#808080', 'white'); // Gray background
      expect(shadow).toContain('rgba(0,0,0,0.6)');
      expect(shadow).toContain('0 1px 2px');
    });
  });





  describe('computeIsLight', () => {
    it('should identify light colors correctly', () => {
      expect(computeIsLight('#FFFFFF')).toBe(true);
      expect(computeIsLight('#FFFF00')).toBe(true); // Yellow
      expect(computeIsLight('#F2F0EA')).toBe(true); // Light beige
    });

    it('should identify dark colors correctly', () => {
      expect(computeIsLight('#000000')).toBe(false);
      expect(computeIsLight('#FF0000')).toBe(false); // Red
      expect(computeIsLight('#0000FF')).toBe(false); // Blue
    });

    it('should handle invalid hex colors', () => {
      expect(computeIsLight('#FFF')).toBe(false); // 3-char hex
      expect(computeIsLight('invalid')).toBe(false);
    });
  });

  describe('getTextColorForBackground', () => {
    it('should return white text in dark mode', () => {
      expect(getTextColorForBackground('#FF0000', true)).toBe('#ffffff');
      expect(getTextColorForBackground('#FFFFFF', true)).toBe('#ffffff');
    });

    it('should return appropriate text color in light mode', () => {
      expect(getTextColorForBackground('#FF0000', false)).toBe('#ffffff'); // Dark bg -> white text
      expect(getTextColorForBackground('#FFFFFF', false)).toBe('#000000'); // Light bg -> black text
      expect(getTextColorForBackground('#FFFF00', false)).toBe('#000000'); // Light bg -> black text
    });

    it('should use custom colors when provided', () => {
      expect(getTextColorForBackground('#FF0000', false, '#fff', '#111')).toBe('#fff');
      expect(getTextColorForBackground('#FFFFFF', false, '#fff', '#111')).toBe('#111');
    });
  });

  describe('getTextShadowForBackground', () => {
    it('should return no shadow in dark mode', () => {
      expect(getTextShadowForBackground('#FF0000', true)).toBe('none');
      expect(getTextShadowForBackground('#FFFFFF', true)).toBe('none');
    });

    it('should return shadow for light backgrounds in light mode', () => {
      expect(getTextShadowForBackground('#FFFFFF', false)).toBe('0 1px 1.5px rgba(0,0,0,0.18)');
      expect(getTextShadowForBackground('#FFFF00', false)).toBe('0 1px 1.5px rgba(0,0,0,0.18)');
    });

    it('should return no shadow for dark backgrounds in light mode', () => {
      expect(getTextShadowForBackground('#FF0000', false)).toBe('none');
      expect(getTextShadowForBackground('#0000FF', false)).toBe('none');
    });
  });
});