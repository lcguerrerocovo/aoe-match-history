---
name: ui-style
description: Use when building or modifying UI components, choosing colors, adding textures, or styling new elements. Ensures visual consistency with the DaVinci-inspired medieval aesthetic.
---

# UI Style Guide

## Design Philosophy

The site uses a **DaVinci-inspired medieval aesthetic** — Renaissance manuscripts, aged parchment, and cross-hatching combined with modern usability. Light mode is warm parchment/cream; dark mode is slate/charcoal.

## Rules

1. **Always use theme tokens** from `ui/src/theme/theme.ts` — never hardcode colors or hex values in components
2. **Use `useLayoutConfig()`** and `ui/src/theme/breakpoints.ts` for responsive layouts — never hardcode breakpoints
3. **Use existing card variants** (`match`, `recordBubble`, `winner`, `loser`, `filter`, `summary`) before creating new ones
4. **Transitions**: 0.3s ease for layout/shadows, 0.2s ease-in-out for interactive elements (links, buttons)
5. **Hover effects**: subtle lift (`translateY(-1px)` or `-2px`) with enhanced shadows — never color-only hovers

## Key Color Tokens

| Token | Purpose |
|-------|---------|
| `brand.gold` / `brand.bronze` | Medieval metal accents, highlights, borders |
| `brand.parchment` | Page background (light mode) |
| `brand.midnightBlue` | Primary text, headings |
| `brand.charcoal` | Desktop body background (light mode) |
| `brand.steel` / `brand.lightSteel` | Secondary text, subtle borders |
| `brand.win` / `brand.loss` / `brand.same` | Match result status |
| `brand.stone` / `brand.stoneLight` | Card backgrounds, neutral surfaces |

## Texture Patterns

Parchment texture is built from layered CSS gradients. When adding textured elements, follow the pattern in `playerStats` or `rankingCard` slot recipes in `theme.ts`:

1. Base parchment gradient (warm earth tones)
2. Cross-hatched `repeating-linear-gradient` at 45deg and -45deg
3. Radial gradients for light/shadow effects
4. Multi-layer `boxShadow` with inset highlights

Dark mode strips textures (`backgroundImage: 'none'`) and uses flat slate colors.

## Typography

- Font: `'Lora', serif` (set globally)
- Base size: 15px
- Headings: `brand.midnightBlue`, weight 600
- Links: `brand.linkDefault` / `brand.linkHover`
