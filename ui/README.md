# AoE2 Match History - Frontend Documentation

A responsive React application for displaying Age of Empires II match history with a medieval-themed design system. Built with TypeScript, Vite, and Chakra UI.

## 🚀 Quick Start

```bash
npm install
npm run dev        # Development server at http://localhost:5173
npm run test       # Run unit tests
npm run cy:open    # Open Cypress for testing
npm run build      # Production build
```

## 🎯 Project Overview

This UI provides an elegant, responsive interface for viewing AoE2 match history with:

- **Medieval-themed design** with authentic color palette and typography
- **Responsive breakpoints** optimized for mobile, tablet (iPad Pro), and desktop
- **Interactive match timeline** with detailed player statistics
- **Professional landing page** with AoE2 branding
- **Comprehensive test coverage** preventing responsive design regressions

# Age of Empires II Match History - UI Documentation

A responsive React application for tracking and analyzing Age of Empires II match history with a medieval-themed design system.

## 🏗️ Component Architecture

### Main Application Structure

```
<App />
├── <ProfileHeader />          // Fixed sidebar with player stats
├── <FilterBar />             // Search and filter controls  
└── <MatchList />             // Main content area
    └── <Accordion />
        └── <MatchGroup />    // Grouped by date
            └── <MatchCard /> // Individual match
```

### MatchCard Component Hierarchy

```
<MatchCard />                    // Main container with "match" theme variant
├── <MatchSummaryCard />        // Always visible: match info & link to aoe2.site
└── <Box data-testid="match-card-content">  // Responsive layout container
    ├── <MapCard />             // Map preview with diamond styling
    └── <TeamCard />            // Player teams and statistics
        └── <Card variant="winner|loser">  // Individual team cards
            └── <VStack />      // Player list
                └── <PlayerBox />  // Individual player row
                    ├── <ColorBar />      // Player color indicator
                    ├── <CivIcon />       // Civilization preview
                    ├── <PlayerName />    // Clickable player link
                    └── <Rating />        // Rating (1v1 only)
```

### Landing Page Structure

```
<LandingPage />                 // Root route "/"
├── <BackgroundPattern />      // Subtle medieval texture
├── <Logo />                   // Clickable AoE2 logo
├── <SiteBranding />          // "aoe2.site" text
├── <CallToAction />          // "View My Matches" button
└── <DescriptionCard />       // Feature explanation
```

## 🎨 Design System

### Theme Structure

Located in `src/theme/theme.ts`:

```
Theme
├── Colors (Medieval Palette)
│   ├── brand.midnightBlue    // Deep noble blue
│   ├── brand.gold            // Lustrous medieval gold  
│   ├── brand.bronze          // Authentic bronze accent
│   ├── brand.parchment       // Elegant backdrop
│   └── brand.steel           // Cool grey outlines
├── Card Variants
│   ├── match                 // Main match container
│   ├── winner/loser          // Team result styling
│   └── filter                // Filter bar styling
└── ProfileHeader Components
    ├── container             // Main profile layout
    ├── avatar                // Player avatar styling
    └── statsTable            // Statistics display
```

### Responsive Breakpoints

Located in `src/theme/breakpoints.ts`:

```
Breakpoints
├── base/sm      // Mobile (default)
├── md          // Tablet (uses lg config)  
├── lg          // iPad Pro (1024px) - CRITICAL for overflow prevention
├── xl/2xl      // Desktop (uses desktop config)
└── Configuration
    ├── matchCard     // Flex direction, gaps, alignment
    ├── teamCard      // Player box sizing, spacing
    ├── mapCard       // Map preview dimensions
    ├── profileHeader // Sidebar positioning
    ├── filterBar     // Control widths
    └── matchList     // Container constraints
```

## 📱 Responsive Design Strategy

### Layout Behavior by Breakpoint

| Breakpoint | MatchCard Layout | ProfileHeader | Key Constraint |
|------------|------------------|---------------|----------------|
| **Mobile** | Column (stacked) | Relative, full-width | 100vw |
| **iPad Pro** | Row (side-by-side) | Fixed sidebar | **520px accordion, 480px match** |
| **Desktop** | Row (spacious) | Fixed sidebar | 740px content |

### Critical iPad Pro Configuration

```typescript
// lg breakpoint - prevents horizontal overflow
matchList: {
  width: '540px',           // Accordion container
  accordionWidth: '540px',  // Accordion itself  
  matchWidth: '500px',      // Individual match container (KEY!)
}
```

**Why 480px?** Provides 40px buffer within the 520px accordion for padding and margins.

## 🧪 Testing Strategy

### Responsive Protection Tests

Located in `*.cy.tsx` files:

```
Cypress Tests
├── MatchList
│   ├── Layout direction changes (mobile → desktop)
│   ├── iPad Pro overflow prevention ⭐
│   └── Accordion bounds compliance
├── FilterBar  
│   └── Element containment on iPad Pro
└── ProfileHeader
    └── Table overflow prevention
```

### Key Test: iPad Pro Overflow Prevention

```typescript
// Critical test in MatchList.cy.tsx
it('should NOT have horizontal overflow on iPad Pro (1024px width)', () => {
  cy.viewport(1024, 1366);
  cy.get('[data-testid="match-card-content"]').then($el => {
    const rect = $el[0].getBoundingClientRect();
    expect(rect.right).to.be.lessThan(1024);
  });
});
```

## ⚙️ Configuration System

### Centralized Sizing

All layout values are configured in `breakpoints.ts` - **NO hardcoded values in components!**

```typescript
// ✅ Correct: Component reads from config
minW={layout?.teamCard.playerBoxMinWidth}

// ❌ Wrong: Hardcoded value  
minW="100px"
```

### Making Layout Changes

1. **Edit values** in `src/theme/breakpoints.ts`
2. **Run tests** to ensure no overflow: `npm run test:e2e`
3. **Test manually** on iPad Pro viewport (1024px)

### Adding New Responsive Properties

1. Add to interface in `breakpoints.ts`:
```typescript
interface LayoutConfig {
  teamCard: {
    newProperty?: string;
  }
}
```

2. Add to all breakpoint configs:
```typescript
const sharedValues = {
  base: { teamCard: { newProperty: 'value' } },
  lg: { teamCard: { newProperty: 'value' } },
  desktop: { teamCard: { newProperty: 'value' } }
}
```

3. Use in component:
```typescript
<Box someProperty={layout?.teamCard.newProperty}>
```

## 🚀 Development Workflow

### Running the Application

```bash
# Development server
npm run dev

# Run responsive tests
npm run test:e2e

# Build for production
npm run build
```

### Key Files to Know

- **`src/theme/breakpoints.ts`** - All responsive configuration
- **`src/theme/theme.ts`** - Colors, card variants, styling
- **`src/components/MatchList.tsx`** - Core match display logic
- **`src/components/LandingPage.tsx`** - Homepage with logo
- **`*.cy.tsx`** - Responsive protection tests

## 🛡️ Maintenance Guidelines

### Before Making Layout Changes

1. **Understand the breakpoint system** - don't hardcode values
2. **Run iPad Pro tests** - prevent overflow regressions
3. **Test on actual devices** - or browser dev tools
4. **Update tests** if you change responsive behavior

### Common Issues

- **iPad overflow** → Check `matchWidth` in lg breakpoint
- **Hardcoded values** → Move to `breakpoints.ts`
- **Test failures** → Verify breakpoint values match expectations
- **Mobile layout broken** → Check base/sm configurations

---

## 🎯 Architecture Decisions

This UI was refactored with these principles:

- **Responsive-first**: Every size value configured per breakpoint
- **Test-protected**: Critical layouts have regression protection  
- **Maintainable**: One config file controls all layout behavior
- **Type-safe**: TypeScript interfaces prevent configuration errors
- **Medieval elegance**: Cohesive design system throughout
