import React, { createContext, useContext } from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import { ThemeProvider, useTheme } from 'next-themes';
import { system } from './theme';

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

// Bridge component: reads next-themes state and exposes our useThemeMode API
function ThemeBridge({ children }: { children: React.ReactNode }) {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const toggleTheme = () => setTheme(isDark ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function CustomThemeProvider({ children }: ThemeProviderProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange={false}>
      <ChakraProvider value={system}>
        <ThemeBridge>{children}</ThemeBridge>
      </ChakraProvider>
    </ThemeProvider>
  );
}
