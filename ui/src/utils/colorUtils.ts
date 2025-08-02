/**
 * Color utility functions for calculating contrast ratios and optimal text colors
 */





/**
 * Convert hex color to RGB values
 */
export const hexToRgb = (hex: string): [number, number, number] => {
  const cleaned = hex.replace('#', '');
  
  // Handle both 3-character and 6-character hex codes
  if (cleaned.length === 3) {
    const r = parseInt(cleaned[0] + cleaned[0], 16);
    const g = parseInt(cleaned[1] + cleaned[1], 16);
    const b = parseInt(cleaned[2] + cleaned[2], 16);
    return [r, g, b];
  } else {
    const r = parseInt(cleaned.substr(0, 2), 16);
    const g = parseInt(cleaned.substr(2, 2), 16);
    const b = parseInt(cleaned.substr(4, 2), 16);
    return [r, g, b];
  }
};

/**
 * Calculate relative luminance of a color
 */
export const getLuminance = (r: number, g: number, b: number): number => {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
};

/**
 * Convert color string to RGB values
 */
const colorToRgb = (color: string): [number, number, number] => {
  // Handle hex colors
  if (color.startsWith('#')) {
    return hexToRgb(color);
  }
  
  // Handle HSL colors
  if (color.startsWith('hsl(')) {
    const match = color.match(/hsl\((\d+)\s+(\d+)%\s+(\d+)%\)/);
    if (match) {
      const h = parseInt(match[1]);
      const s = parseInt(match[2]);
      const l = parseInt(match[3]);
      const hex = hslToHex(h, s, l);
      return hexToRgb(hex);
    }
  }
  
  // Handle named colors or other formats
  console.error(`Unsupported color format: ${color}`);
  return [0, 0, 0]; // Fallback to black
};

/**
 * Calculate contrast ratio between two colors
 */
export const getContrastRatio = (color1: string, color2: string): number => {
  const [r1, g1, b1] = colorToRgb(color1);
  const [r2, g2, b2] = colorToRgb(color2);
  
  // Validate that we got valid RGB values
  if (isNaN(r1) || isNaN(g1) || isNaN(b1) || isNaN(r2) || isNaN(g2) || isNaN(b2)) {
    console.error(`Invalid color: ${color1} or ${color2}`);
    return 1; // Return minimum contrast
  }
  
  const lum1 = getLuminance(r1, g1, b1);
  const lum2 = getLuminance(r2, g2, b2);
  
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  
  return (brightest + 0.05) / (darkest + 0.05);
};

/**
 * Convert HSL to hex color
 */
const hslToHex = (h: number, s: number, l: number): string => {
  l = l / 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};



/**
 * Get optimal text color for a given background color following WCAG 2.1 guidelines
 */
export const getOptimalTextColor = (
  backgroundColor: string,
  whiteColor: string = '#ffffff',
  blackColor: string = '#000000',
  minContrast: number = 4.5       // AA for normal text
): 'white' | 'black' => {
  // Validate input colors (hex or HSL)
  const hexRegex = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;
  const hslRegex = /^hsl\(\d+\s+\d+%\s+\d+%\)$/i;
  
  const isValidColor = (color: string) => hexRegex.test(color) || hslRegex.test(color);
  
  if (!isValidColor(backgroundColor) || !isValidColor(whiteColor) || !isValidColor(blackColor)) {
    throw new Error('Invalid color format. Expected #RGB, #RRGGBB, RGB, RRGGBB, or hsl(h s% l%)');
  }

  const whiteContrast = getContrastRatio(backgroundColor, whiteColor);
  const blackContrast = getContrastRatio(backgroundColor, blackColor);

  // Pick whichever has higher contrast
  const choice = whiteContrast >= blackContrast ? 'white' : 'black';
  const contrast = Math.max(whiteContrast, blackContrast);

  // Warn if neither meets WCAG AA
  if (contrast < minContrast) {
    console.warn(
      `Contrast ratio (${contrast.toFixed(2)}) is below ${minContrast}:1 – ` +
      `choose a different background colour or increase text size. Background: ${backgroundColor}`
    );
  }

  return choice;
};

/**
 * Get text shadow for better readability
 */
export const getTextShadow = (
  backgroundColor: string, 
  textColor: 'white' | 'black',
  whiteColor: string = '#fff',
  blackColor: string = '#111'
): string => {
  const actualTextColor = textColor === 'white' ? whiteColor : blackColor;
  const contrast = getContrastRatio(backgroundColor, actualTextColor);
  
  // Less aggressive shadow application
  if (contrast < 4.5) { // WCAG AA standard for normal text
    const shadowColor = textColor === 'white' ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)';
    return `0 1px 2px ${shadowColor}`;
  } else if (contrast < 7) { // Additional shadow for moderate contrast
    const shadowColor = textColor === 'white' ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)';
    return `0 1px 1px ${shadowColor}`;
  }
  
  return 'none';
};







/**
 * Compute if a hex color is light based on luminance
 * Uses the same formula as FullMatchSummaryCard for consistency
 */
export const computeIsLight = (hex: string): boolean => {
  const cleaned = hex.replace('#', '');
  if (cleaned.length !== 6) return false;
  const r = parseInt(cleaned.substr(0, 2), 16);
  const g = parseInt(cleaned.substr(2, 2), 16);
  const b = parseInt(cleaned.substr(4, 2), 16);
  // Perceptive luminance formula (lower threshold to match APM pill logic)
  return (0.299 * r + 0.587 * g + 0.114 * b) > 130;
};

/**
 * Get optimal text color for a background using the same logic as FullMatchSummaryCard
 * @param backgroundColor - The background color in hex format
 * @param isDarkMode - Whether the app is in dark mode
 * @param whiteColor - White color to use (defaults to theme white)
 * @param blackColor - Black color to use (defaults to theme black)
 */
export const getTextColorForBackground = (
  backgroundColor: string,
  isDarkMode: boolean,
  whiteColor: string = '#ffffff',
  blackColor: string = '#000000'
): string => {
  const isLightBg = computeIsLight(backgroundColor);
  // In dark mode, always use white for the text
  // In light mode, use dark text for light backgrounds, white for dark backgrounds
  return isDarkMode ? whiteColor : (isLightBg ? blackColor : whiteColor);
};

/**
 * Get text shadow for a background using the same logic as FullMatchSummaryCard
 * @param backgroundColor - The background color in hex format
 * @param isDarkMode - Whether the app is in dark mode
 */
export const getTextShadowForBackground = (
  backgroundColor: string,
  isDarkMode: boolean
): string => {
  const isLightBg = computeIsLight(backgroundColor);
  // Only add text shadow for light backgrounds in light mode
  const needsShadow = !isDarkMode && isLightBg;
  return needsShadow ? '0 1px 1.5px rgba(0,0,0,0.18)' : 'none';
};