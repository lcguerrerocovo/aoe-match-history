import { promises as fs } from 'fs';
import { join } from 'path';
import { describe, it, expect, beforeAll } from 'vitest';
import process from 'node:process';

const COMPONENTS_DIR = join(process.cwd(), 'src/components');
const THEME_DIR = join(process.cwd(), 'src/theme');

// Patterns to detect hardcoded colors
const COLOR_PATTERNS = [
  // Hex colors (but not in comments)
  /(?<!\/\/.*?)(?<!\/\*[\s\S]*?)(#[0-9A-Fa-f]{3,8})\b/g,
  // RGB/RGBA (but not in comments)  
  /(?<!\/\/.*?)(?<!\/\*[\s\S]*?)(rgba?\s*\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[\d.]+)?\s*\))/g,
  // HSL/HSLA (but not in comments)
  /(?<!\/\/.*?)(?<!\/\*[\s\S]*?)(hsla?\s*\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*(?:,\s*[\d.]+)?\s*\))/g,
];

// Common color names that should use theme variables
const HARDCODED_COLOR_NAMES = [
  'white', 'black', 'red', 'green', 'blue', 'yellow', 'orange', 'purple',
  'pink', 'brown', 'gray', 'grey', 'cyan', 'magenta', 'lime', 'maroon',
  'navy', 'olive', 'silver', 'teal', 'aqua', 'fuchsia'
];

// Chakra color token pattern (e.g., blue.400, gray.600) - only match known color names
const CHAKRA_COLOR_PATTERN = /(['"`]?)((?:red|green|blue|yellow|orange|purple|pink|brown|gray|grey|cyan|magenta|lime|maroon|navy|olive|silver|teal|aqua|fuchsia|indigo|violet)\.\d+)\1/g;

// Allowed exceptions (semantic values)
const ALLOWED_EXCEPTIONS = [
  'transparent', 'inherit', 'currentColor', 'initial', 'unset', 'none',
  // CSS gradient keywords
  'to', 'from', 'at', 'circle', 'ellipse', 'linear', 'radial',
  // Positioning keywords
  'center', 'top', 'bottom', 'left', 'right'
];

// Patterns that should be ignored (not colors)
const NON_COLOR_PATTERNS = [
  /\b\d+\.\d+\b/g,         // Decimal numbers (1.5, 0.3, etc.)
  /\b\d+px\b/g,            // Pixel values
  /\b\d+rem\b/g,           // Rem values
  /\b\d+em\b/g,            // Em values  
  /\b\d+%\b/g,             // Percentage values
  /\b\d+s\b/g,             // Time values (seconds)
  /\b\d+ms\b/g,            // Time values (milliseconds)
  /cubic-bezier\([^)]+\)/g, // Cubic bezier functions
  /transform:\s*[^;]+/g,    // CSS transform values
  /opacity:\s*[\d.]+/g,     // Opacity values
  /lineHeight:\s*["'][\d.]+["']/g, // Line height values
  /fontSize:\s*["'][\d.]+["']/g,   // Font size values
  /spacing:\s*[\d.]+/g,     // Spacing values
  /gap:\s*[\d.]+/g,         // Gap values
  /toFixed\(\d+\)/g,        // Number formatting
  /Math\.\w+\([^)]+\)/g,    // Math operations
];

async function getAllFiles(dir: string, extension: string): Promise<string[]> {
  const files: string[] = [];
  
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      
      if (entry.isDirectory()) {
        const subFiles = await getAllFiles(fullPath, extension);
        files.push(...subFiles);
      } else if (entry.name.endsWith(extension)) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    // Directory might not exist, that's ok
  }
  
  return files;
}

function findHardcodedColors(content: string, filePath: string): Array<{ line: number; color: string; context: string }> {
  const issues: Array<{ line: number; color: string; context: string }> = [];
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    
    // Skip comment lines, test files, and legitimate color definition files
    if (line.trim().startsWith('//') || 
        line.trim().startsWith('/*') || 
        filePath.includes('.test.') || 
        filePath.includes('.cy.') ||
        filePath.includes('playerColors.ts') || // Game player colors
        filePath.includes('theme.ts') ||        // Theme definitions themselves
        filePath.includes('breakpoints.ts')) {   // Responsive breakpoints
      return;
    }
    
    // Skip lines that contain non-color patterns (mathematical constants, etc.)
    const isNonColorLine = NON_COLOR_PATTERNS.some(pattern => {
      const matches = Array.from(line.matchAll(pattern));
      return matches.length > 0;
    });
    
    if (isNonColorLine) {
      return;
    }
    
    // Check for hex, rgb, hsl patterns
    COLOR_PATTERNS.forEach(pattern => {
      const matches = Array.from(line.matchAll(pattern));
      matches.forEach(_match => {
        const color = _match[1] || _match[0];
        // Skip if it's part of a brand.* reference or in a comment
        if (!line.includes('brand.') && !line.includes('//')) {
          issues.push({
            line: lineNumber,
            color,
            context: line.trim()
          });
        }
      });
    });
    
    // Check for Chakra color tokens (e.g., blue.400, gray.600)
    const chakraMatches = Array.from(line.matchAll(CHAKRA_COLOR_PATTERN));
    chakraMatches.forEach(match => {
      const colorToken = match[2]; // The actual color token (e.g., "blue.400")
      // Skip if it's part of a brand.* reference, in a comment, or a legitimate theme reference
      if (!line.includes('brand.') && !line.includes('//') && !line.includes('theme.colors.')) {
        issues.push({
          line: lineNumber,
          color: colorToken,
          context: line.trim()
        });
      }
    });
    
    // Check for hardcoded color names
    HARDCODED_COLOR_NAMES.forEach(colorName => {
      // Create regex to match color name as a value (not as part of a word)
      const colorRegex = new RegExp(`['"\`]\\s*${colorName}\\s*['"\`]|:\\s*${colorName}\\s*[,;}]`, 'gi');
      const matches = Array.from(line.matchAll(colorRegex));
      
      matches.forEach(_match => {
        // Skip if it's an allowed exception or part of theme reference
        if (!ALLOWED_EXCEPTIONS.includes(colorName.toLowerCase()) && 
            !line.includes('brand.') && 
            !line.includes('//')) {
          issues.push({
            line: lineNumber,
            color: colorName,
            context: line.trim()
          });
        }
      });
    });
  });
  
  return issues;
}

describe('Theme Compliance', () => {
  let componentFiles: string[] = [];
  
  beforeAll(async () => {
    const allFiles = [
      ...(await getAllFiles(COMPONENTS_DIR, '.tsx')),
      ...(await getAllFiles(COMPONENTS_DIR, '.ts')),
    ];
    
    // Filter out non-component files (like playerColors.ts which defines color constants)
    componentFiles = allFiles.filter(file => 
      !file.includes('playerColors.ts') // This file legitimately has hardcoded colors for game players
    );
  });

  it('should not contain hardcoded colors in component files', async () => {
    const violations: Array<{ file: string; issues: Array<{ line: number; color: string; context: string }> }> = [];
    
    for (const filePath of componentFiles) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const issues = findHardcodedColors(content, filePath);
        
        if (issues.length > 0) {
          violations.push({
            file: filePath.replace(process.cwd() + '/src', '/src'),
            issues
          });
        }
      } catch (error) {
        console.warn(`Could not read file ${filePath}:`, error);
      }
    }
    
    if (violations.length > 0) {
      const errorMessage = violations.map(violation => {
        const issuesText = violation.issues.map(issue => 
          `  Line ${issue.line}: "${issue.color}" in: ${issue.context}`
        ).join('\n');
        
        return `\n${violation.file}:\n${issuesText}`;
      }).join('\n');
      
      throw new Error(`Found hardcoded colors in component files. Use theme variables instead:${errorMessage}\n\nConsider using:\n- brand.* colors from theme\n- Chakra color tokens (gray.200, etc.)\n- CSS semantic values (transparent, inherit)`);
    }
  });

  it('should have theme files that export proper color tokens', async () => {
    const themeFiles = await getAllFiles(THEME_DIR, '.ts');
    expect(themeFiles.length).toBeGreaterThan(0);
    
    // Only check actual theme/color files, not breakpoints or other config
    const colorThemeFiles = themeFiles.filter(file => 
      file.includes('theme.ts') || file.includes('color')
    );
    
    expect(colorThemeFiles.length).toBeGreaterThan(0);
    
    for (const filePath of colorThemeFiles) {
      const content = await fs.readFile(filePath, 'utf-8');
      
      // Color theme files should contain brand color definitions
      expect(content).toMatch(/brand\s*:\s*{/);
    }
  });

  it('should have centralized color definitions', async () => {
    const themeContent = await fs.readFile(join(THEME_DIR, 'theme.ts'), 'utf-8');
    
    // Should have light and dark color definitions
    expect(themeContent).toMatch(/lightColors/);
    expect(themeContent).toMatch(/darkColors/);
    
    // Should export createTheme function
    expect(themeContent).toMatch(/export function createTheme/);
    
    // Essential brand colors should be defined
    const essentialColors = ['midnightBlue', 'gold', 'steel', 'parchment'];
    essentialColors.forEach(color => {
      expect(themeContent).toMatch(new RegExp(color));
    });
  });

  it('should use theme variables in component imports', async () => {
    for (const filePath of componentFiles) {
      const content = await fs.readFile(filePath, 'utf-8');
      
      // If file uses useTheme, it should be from Chakra
      if (content.includes('useTheme')) {
        expect(content).toMatch(/import.*useTheme.*from ['"]@chakra-ui\/react['"]/);
      }
      
      // If file uses theme mode, it should be from our provider
      if (content.includes('useThemeMode')) {
        expect(content).toMatch(/import.*useThemeMode.*from ['"].*ThemeProvider['"]/);
      }
    }
  });
}); 