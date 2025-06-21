import { useBreakpointValue } from '@chakra-ui/react';
import type { ResponsiveValue } from '@chakra-ui/react';

export type Breakpoint = 'base' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

// Shared values for breakpoints with same values
const sharedValues = {
  base: {
    container: {
      maxWidth: '100vw',
      padding: '0.25rem',
      marginLeft: '0',
    },
    mainContent: {
      padding: '0.25rem',
    },
    matchCard: {
      width: '100%',
      marginBottom: '1rem',
      padding: '1rem',
      flexDirection: 'column' as const,
      gap: '1rem',
      alignItems: 'flex-start' as const,
      justifyContent: 'flex-start',
    },
    teamCard: {
      width: '100%',
      flexDirection: 'column' as const,
      gap: '0.5rem',
      minWidth: '100%',
      playerBoxMinWidth: '0',
      playerBoxMaxWidth: '100%',
      playerBoxFlex: '1',
      teamVStackSpacing: '0',
      teamVStackAlign: 'stretch',
      teamVStackWidth: '100%',
      colorBarWidth: '8px',
      colorBarHeight: '16px',
      civIconSize: '21px',
      civFontSize: '9px',
      playerNameFontSize: '12px',
      playerNameMaxWidth1v1: '90px',
      playerNameMaxWidthTeam: '130px',
      ratingFontSize: '12px',
      ratingMinWidth: '22px',
    },
    mapCard: {
      minWidth: '80px',
      maxWidth: '120px',
      padding: '0.5rem',
      marginBottom: '0.5rem',
      diamondSize: '75px',
    },
    profileHeader: {
      width: '100%',
      height: 'auto',
      padding: '1rem',
      marginBottom: '1rem',
      borderRight: 'none',
      borderBottom: '1px',
      position: 'relative' as const,
      top: 'auto',
      left: 'auto',
      zIndex: 'auto',
      avatar: {
        size: '100px',
        iconSize: '6',
      },
      text: {
        nameSize: 'lg',
        idSize: 'xs',
      },
      table: {
        boardWidth: '35%',
        rankWidth: '20%',
        ratingWidth: '20%',
        maxWidth: '15%',
        changeWidth: '10%',
        gamesWidth: '25%',
        wonWidth: '25%',
        streakWidth: '15%',
      }
    },
    filterBar: {
      width: '100%',
      padding: '1rem',
      marginBottom: '1rem',
      gap: '1rem',
      selectWidth: '120px',
      inputWidth: '200px',
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
  desktop: {
    // Critical: marginLeft must be >= profileHeader.width (300px) + padding to prevent overlap
    // This ensures the main content starts after the fixed profile header
    container: {
      maxWidth: 'container.xl',
      padding: '1rem',
      marginLeft: '320px',
    },
    mainContent: {
      padding: '1rem',
    },
    matchCard: {
      width: '100%',
      marginBottom: '1rem',
      padding: '1.5rem',
      flexDirection: 'row' as const,
      gap: '2rem',
      alignItems: 'center' as const,
      justifyContent: 'space-between',
    },
    teamCard: {
      width: '100%',
      flexDirection: 'row' as const,
      gap: '1.5rem',
      minWidth: '140px',
      playerBoxMinWidth: '200px',
      playerBoxMaxWidth: '100%',
      playerBoxFlex: '1',
      teamVStackSpacing: '0',
      teamVStackAlign: 'stretch',
      teamVStackWidth: '100%',
      colorBarWidth: '8px',
      colorBarHeight: '16px',
      civIconSize: '21px',
      civFontSize: '9px',
      playerNameFontSize: '12px',
      playerNameMaxWidth1v1: '90px',
      playerNameMaxWidthTeam: '130px',
      ratingFontSize: '12px',
      ratingMinWidth: '22px',
    },
    mapCard: {
      minWidth: '80px',
      maxWidth: '120px',
      padding: '0.5rem',
      marginBottom: '0',
      diamondSize: '75px',
    },
    profileHeader: {
      width: '320px',
      height: '100vh',
      padding: '2rem',
      marginBottom: '1rem',
      borderRight: '1px',
      borderBottom: 'none',
      position: 'fixed' as const,
      top: '0',
      left: '0',
      zIndex: '1',
      avatar: {
        size: '120px',
        iconSize: '8',
      },
      text: {
        nameSize: 'xl',
        idSize: 'xs',
      },
      table: {
        boardWidth: '35%',
        rankWidth: '20%',
        ratingWidth: '20%',
        maxWidth: '15%',
        changeWidth: '10%',
        gamesWidth: '25%',
        wonWidth: '25%',
        streakWidth: '15%',
      }
    },
    filterBar: {
      width: '100%',
      padding: '0.5rem',
      marginBottom: '0.5rem',
      gap: '0.5rem',
      selectWidth: '140px',
      inputWidth: '200px',
    },
    matchList: {
      width: '740px',
      maxWidth: '740px',
      overflow: 'hidden',
      accordionWidth: '740px',
      groupWidth: '740px',
      groupMinHeight: '220px',
      matchWidth: '700px',
      groupGap: '2rem',
      groupPadding: '2rem',
    },
  },
  lg: {
    container: {
      maxWidth: 'container.lg',
      padding: '0.5rem',
      marginLeft: '320px',
    },
    mainContent: {
      padding: '0.5rem',
    },
    matchCard: {
      width: '100%',
      marginBottom: '0.5rem',
      padding: '1rem',
      flexDirection: 'row' as const,
      gap: '1rem',
      alignItems: 'center' as const,
      justifyContent: 'space-between',
    },
    teamCard: {
      width: '100%',
      flexDirection: 'row' as const,
      gap: '0.5rem',
      minWidth: '0',
      playerBoxMinWidth: '0',
      playerBoxMaxWidth: '100%',
      playerBoxFlex: '1',
      teamVStackSpacing: '0',
      teamVStackAlign: 'stretch',
      teamVStackWidth: '100%',
      colorBarWidth: '6px',
      colorBarHeight: '14px',
      civIconSize: '18px',
      civFontSize: '8px',
      playerNameFontSize: '10px',
      playerNameMaxWidth1v1: '80px',
      playerNameMaxWidthTeam: '100px',
      ratingFontSize: '10px',
      ratingMinWidth: '18px',
    },
    mapCard: {
      minWidth: '70px',
      maxWidth: '100px',
      padding: '0.25rem',
      marginBottom: '0',
      diamondSize: '75px',
    },
    profileHeader: {
      width: '300px',
      height: '100vh',
      padding: '1.5rem',
      marginBottom: '0.5rem',
      borderRight: '1px',
      borderBottom: 'none',
      position: 'fixed' as const,
      top: '0',
      left: '0',
      zIndex: '1',
      avatar: {
        size: '110px',
        iconSize: '7',
      },
      text: {
        nameSize: 'xl',
        idSize: 'xs',
      },
      table: {
        boardWidth: '35%',
        rankWidth: '20%',
        ratingWidth: '20%',
        maxWidth: '15%',
        changeWidth: '10%',
        gamesWidth: '25%',
        wonWidth: '25%',
        streakWidth: '15%',
      }
    },
    filterBar: {
      width: '100%',
      padding: '0.5rem',
      marginBottom: '0.5rem',
      gap: '0.5rem',
      selectWidth: '100px',
      inputWidth: '200px',
    },
    matchList: {
      width: '700px',
      maxWidth: '700px',
      overflow: 'hidden',
      accordionWidth: '700px',
      groupWidth: '700px',
      groupMinHeight: '180px',
      matchWidth: '660px',
      groupGap: '1rem',
      groupPadding: '1rem',
    },
  },
};

export interface LayoutConfig {
  container: {
    maxWidth: string;
    padding: string;
    marginLeft: string;
  };
  mainContent: {
    padding: string;
  };
  matchCard: {
    width: string;
    marginBottom: string;
    padding: string;
    flexDirection: ResponsiveValue<'row' | 'column'>;
    gap: string;
    alignItems: ResponsiveValue<'flex-start' | 'center'>;
    justifyContent: string;
  };
  teamCard: {
    width: string;
    flexDirection: ResponsiveValue<'row' | 'column'>;
    gap: string;
    minWidth: string;
    playerBoxMinWidth: ResponsiveValue<string>;
    playerBoxMaxWidth?: string;
    playerBoxFlex?: string;
    teamVStackSpacing?: string;
    teamVStackAlign?: string;
    teamVStackWidth?: string;
    colorBarWidth?: string;
    colorBarHeight?: string;
    civIconSize?: string;
    civFontSize?: string;
    playerNameFontSize?: string;
    playerNameMaxWidth1v1?: string;
    playerNameMaxWidthTeam?: string;
    ratingFontSize?: string;
    ratingMinWidth?: string;
  };
  mapCard: {
    minWidth: string;
    maxWidth: string;
    padding: string;
    marginBottom: string;
    diamondSize?: string;
  };
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
    avatar: {
      size: string;
      iconSize: string;
    };
    text: {
      nameSize: string;
      idSize: string;
    };
    table: {
      boardWidth: string;
      rankWidth: string;
      ratingWidth: string;
      maxWidth: string;
      changeWidth: string;
      gamesWidth: string;
      wonWidth: string;
      streakWidth: string;
    };
  };
  filterBar: {
    width: string;
    padding: string;
    marginBottom: string;
    gap: string;
    selectWidth: string;
    inputWidth: string;
  };
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
  base: sharedValues.base,
  sm: sharedValues.base,
  md: sharedValues.lg,
  lg: sharedValues.lg,
  xl: sharedValues.desktop,
  '2xl': sharedValues.desktop,
};

export function useLayoutConfig() {
  const breakpoint = useBreakpointValue({ base: 'base', md: 'md', lg: 'lg', xl: 'desktop' });

  const getConfigForBreakpoint = (bp: string | undefined): LayoutConfig => {
    switch (bp) {
      case 'md':
        return sharedValues.lg; // Use 'lg' styles for 'md' for consistency
      case 'lg':
        return sharedValues.lg;
      case 'desktop':
        return sharedValues.desktop;
      default:
        return sharedValues.base;
    }
  };

  return getConfigForBreakpoint(breakpoint);
} 