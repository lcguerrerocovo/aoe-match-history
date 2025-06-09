import { useBreakpointValue } from '@chakra-ui/react';
import type { ResponsiveValue } from '@chakra-ui/react';

export const breakpoints = {
  base: '0px',
  sm: '480px',
  md: '768px',
  lg: '992px',
  xl: '1280px',
  '2xl': '1536px',
};

export type Breakpoint = 'base' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface LayoutConfig {
  // Main container layout
  container: {
    maxWidth: string;
    padding: string;
    marginLeft: string;
  };
  // Grid layout
  grid: {
    templateColumns: string;
    gap: string;
    padding: string;
  };
  // Match card layout
  matchCard: {
    width: string;
    marginBottom: string;
    padding: string;
    flexDirection: ResponsiveValue<'row' | 'column'>;
    gap: string;
    alignItems: ResponsiveValue<'flex-start' | 'center'>;
    justifyContent: string;
  };
  // Team card layout
  teamCard: {
    width: string;
    flexDirection: ResponsiveValue<'row' | 'column'>;
    gap: string;
    minWidth: string;
    playerBoxMinWidth: ResponsiveValue<string>;
  };
  // Map card layout
  mapCard: {
    minWidth: string;
    maxWidth: string;
    padding: string;
    marginBottom: string;
  };
  // Profile header layout
  profileHeader: {
    width: string;
    height: string;
    padding: string;
    marginBottom: string;
    borderRight: string;
    borderBottom: string;
    position: ResponsiveValue<'relative' | 'fixed'>;
    top: string;
    left: string;
    zIndex: string;
  };
  // Filter bar layout
  filterBar: {
    width: string;
    padding: string;
    marginBottom: string;
    gap: string;
  };
  // Match list layout
  matchList: {
    width: string;
    maxWidth: string;
    overflow: string;
    accordionWidth: string;
    groupWidth: string;
    groupMinHeight: string;
    matchWidth: string;
    groupGap: string;
    groupPadding: string;
  };
}

export const layoutConfig: Record<Breakpoint, LayoutConfig> = {
  base: {
    container: {
      maxWidth: '100vw',
      padding: '1rem',
      marginLeft: '0',
    },
    grid: {
      templateColumns: '1fr',
      gap: '1rem',
      padding: '1rem',
    },
    matchCard: {
      width: '100%',
      marginBottom: '1rem',
      padding: '1rem',
      flexDirection: 'column',
      gap: '1rem',
      alignItems: 'flex-start',
      justifyContent: 'flex-start',
    },
    teamCard: {
      width: '100%',
      flexDirection: 'column',
      gap: '0.5rem',
      minWidth: '100%',
      playerBoxMinWidth: '0',
    },
    mapCard: {
      minWidth: '80px',
      maxWidth: '120px',
      padding: '0.5rem',
      marginBottom: '0.5rem',
    },
    profileHeader: {
      width: '100%',
      height: 'auto',
      padding: '1rem',
      marginBottom: '1rem',
      borderRight: 'none',
      borderBottom: '1px',
      position: 'relative',
      top: 'auto',
      left: 'auto',
      zIndex: 'auto',
    },
    filterBar: {
      width: '100%',
      padding: '1rem',
      marginBottom: '1rem',
      gap: '1rem',
    },
    matchList: {
      width: '100%',
      maxWidth: '100vw',
      overflow: 'hidden',
      accordionWidth: '100%',
      groupWidth: '100%',
      groupMinHeight: '180px',
      matchWidth: '100%',
      groupGap: '1rem',
      groupPadding: '1rem',
    },
  },
  sm: {
    container: {
      maxWidth: '100vw',
      padding: '1rem',
      marginLeft: '0',
    },
    grid: {
      templateColumns: '1fr',
      gap: '1rem',
      padding: '1rem',
    },
    matchCard: {
      width: '100%',
      marginBottom: '1rem',
      padding: '1rem',
      flexDirection: 'column',
      gap: '1rem',
      alignItems: 'flex-start',
      justifyContent: 'flex-start',
    },
    teamCard: {
      width: '100%',
      flexDirection: 'column',
      gap: '0.5rem',
      minWidth: '100%',
      playerBoxMinWidth: '0',
    },
    mapCard: {
      minWidth: '80px',
      maxWidth: '120px',
      padding: '0.5rem',
      marginBottom: '0.5rem',
    },
    profileHeader: {
      width: '100%',
      height: 'auto',
      padding: '1rem',
      marginBottom: '1rem',
      borderRight: 'none',
      borderBottom: '1px',
      position: 'relative',
      top: 'auto',
      left: 'auto',
      zIndex: 'auto',
    },
    filterBar: {
      width: '100%',
      padding: '1rem',
      marginBottom: '1rem',
      gap: '1rem',
    },
    matchList: {
      width: '100%',
      maxWidth: '100vw',
      overflow: 'hidden',
      accordionWidth: '100%',
      groupWidth: '100%',
      groupMinHeight: '180px',
      matchWidth: '100%',
      groupGap: '1rem',
      groupPadding: '1rem',
    },
  },
  md: {
    container: {
      maxWidth: 'container.xl',
      padding: '2rem',
      marginLeft: '280px',
    },
    grid: {
      templateColumns: '1fr',
      gap: '1.5rem',
      padding: '1.5rem',
    },
    matchCard: {
      width: '100%',
      marginBottom: '1rem',
      padding: '1rem',
      flexDirection: 'row',
      gap: '1.5rem',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    teamCard: {
      width: '100%',
      flexDirection: 'row',
      gap: '1rem',
      minWidth: '140px',
      playerBoxMinWidth: '200px',
    },
    mapCard: {
      minWidth: '80px',
      maxWidth: '120px',
      padding: '0.5rem',
      marginBottom: '0',
    },
    profileHeader: {
      width: '280px',
      height: '100vh',
      padding: '1.5rem',
      marginBottom: '1.5rem',
      borderRight: '1px',
      borderBottom: 'none',
      position: 'fixed',
      top: '0',
      left: '0',
      zIndex: '1',
    },
    filterBar: {
      width: '100%',
      padding: '1.5rem',
      marginBottom: '1.5rem',
      gap: '1.5rem',
    },
    matchList: {
      width: '100%',
      maxWidth: '100vw',
      overflow: 'hidden',
      accordionWidth: '740px',
      groupWidth: '740px',
      groupMinHeight: '220px',
      matchWidth: '700px',
      groupGap: '1.5rem',
      groupPadding: '1.5rem',
    },
  },
  lg: {
    container: {
      maxWidth: 'container.xl',
      padding: '2rem',
      marginLeft: '280px',
    },
    grid: {
      templateColumns: '1fr',
      gap: '2rem',
      padding: '2rem',
    },
    matchCard: {
      width: '100%',
      marginBottom: '1rem',
      padding: '1.5rem',
      flexDirection: 'row',
      gap: '2rem',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    teamCard: {
      width: '100%',
      flexDirection: 'row',
      gap: '1.5rem',
      minWidth: '140px',
      playerBoxMinWidth: '200px',
    },
    mapCard: {
      minWidth: '80px',
      maxWidth: '120px',
      padding: '0.5rem',
      marginBottom: '0',
    },
    profileHeader: {
      width: '280px',
      height: '100vh',
      padding: '2rem',
      marginBottom: '2rem',
      borderRight: '1px',
      borderBottom: 'none',
      position: 'fixed',
      top: '0',
      left: '0',
      zIndex: '1',
    },
    filterBar: {
      width: '100%',
      padding: '2rem',
      marginBottom: '2rem',
      gap: '2rem',
    },
    matchList: {
      width: '100%',
      maxWidth: '100vw',
      overflow: 'hidden',
      accordionWidth: '740px',
      groupWidth: '740px',
      groupMinHeight: '220px',
      matchWidth: '700px',
      groupGap: '2rem',
      groupPadding: '2rem',
    },
  },
  xl: {
    container: {
      maxWidth: 'container.xl',
      padding: '2rem',
      marginLeft: '280px',
    },
    grid: {
      templateColumns: '1fr',
      gap: '2rem',
      padding: '2rem',
    },
    matchCard: {
      width: '100%',
      marginBottom: '1rem',
      padding: '1.5rem',
      flexDirection: 'row',
      gap: '2rem',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    teamCard: {
      width: '100%',
      flexDirection: 'row',
      gap: '1.5rem',
      minWidth: '140px',
      playerBoxMinWidth: '200px',
    },
    mapCard: {
      minWidth: '80px',
      maxWidth: '120px',
      padding: '0.5rem',
      marginBottom: '0',
    },
    profileHeader: {
      width: '280px',
      height: '100vh',
      padding: '2rem',
      marginBottom: '2rem',
      borderRight: '1px',
      borderBottom: 'none',
      position: 'fixed',
      top: '0',
      left: '0',
      zIndex: '1',
    },
    filterBar: {
      width: '100%',
      padding: '2rem',
      marginBottom: '2rem',
      gap: '2rem',
    },
    matchList: {
      width: '100%',
      maxWidth: '100vw',
      overflow: 'hidden',
      accordionWidth: '740px',
      groupWidth: '740px',
      groupMinHeight: '220px',
      matchWidth: '700px',
      groupGap: '2rem',
      groupPadding: '2rem',
    },
  },
  '2xl': {
    container: {
      maxWidth: 'container.xl',
      padding: '2rem',
      marginLeft: '280px',
    },
    grid: {
      templateColumns: '1fr',
      gap: '2rem',
      padding: '2rem',
    },
    matchCard: {
      width: '100%',
      marginBottom: '1rem',
      padding: '1.5rem',
      flexDirection: 'row',
      gap: '2rem',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    teamCard: {
      width: '100%',
      flexDirection: 'row',
      gap: '1.5rem',
      minWidth: '140px',
      playerBoxMinWidth: '200px',
    },
    mapCard: {
      minWidth: '80px',
      maxWidth: '120px',
      padding: '0.5rem',
      marginBottom: '0',
    },
    profileHeader: {
      width: '280px',
      height: '100vh',
      padding: '2rem',
      marginBottom: '2rem',
      borderRight: '1px',
      borderBottom: 'none',
      position: 'fixed',
      top: '0',
      left: '0',
      zIndex: '1',
    },
    filterBar: {
      width: '100%',
      padding: '2rem',
      marginBottom: '2rem',
      gap: '2rem',
    },
    matchList: {
      width: '100%',
      maxWidth: '100vw',
      overflow: 'hidden',
      accordionWidth: '740px',
      groupWidth: '740px',
      groupMinHeight: '220px',
      matchWidth: '700px',
      groupGap: '2rem',
      groupPadding: '2rem',
    },
  },
};

export function useLayoutConfig() {
  return useBreakpointValue(layoutConfig);
} 