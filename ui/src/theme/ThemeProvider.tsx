import React, { createContext, useContext, useState, useEffect } from 'react';
import { ChakraProvider, ColorModeScript } from '@chakra-ui/react';
import { type ThemeConfig } from '@chakra-ui/react';
import { createTheme } from './theme';

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useThemeMode = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeMode must be used within a ThemeProvider');
  }
  return context;
};

const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: false,
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function CustomThemeProvider({ children }: ThemeProviderProps) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('theme-mode');
    if (stored) {
      setIsDark(stored === 'dark');
    }
  }, []);

  const toggleTheme = () => {
    const newMode = !isDark;
    setIsDark(newMode);
    localStorage.setItem('theme-mode', newMode ? 'dark' : 'light');
  };

  // Create theme based on current mode - all logic centralized in theme.ts
  const dynamicTheme = createTheme(isDark);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      <ChakraProvider theme={dynamicTheme}>
        <ColorModeScript initialColorMode={config.initialColorMode} />
        {children}
      </ChakraProvider>
    </ThemeContext.Provider>
  );
} 