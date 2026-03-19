---
name: ui-style
description: Use when building or modifying UI components, choosing colors, adding textures, or styling new elements. Ensures visual consistency with the DaVinci-inspired medieval aesthetic.
---

# UI Style Guide

## Design Philosophy

The site uses a **Da Vinci Codex aesthetic** — a leather-bound manuscript brought to life as a web app. The TopBar is the oxblood leather cover with gold tooling; all content areas are transparent manuscript pages on warm aged parchment. Content is organized by placement, ruled lines, and ink weight — not by cards, shadows, or containers.

## Rules

1. **Always use theme tokens** from `ui/src/theme/theme.ts` — never hardcode colors or hex values in components
2. **Use `useLayoutConfig()`** and `ui/src/theme/breakpoints.ts` for responsive layouts — never hardcode breakpoints
3. **Use existing card variants** (`match`, `recordBubble`, `winner`, `loser`, `filter`, `summary`) before creating new ones
4. **Transitions**: 0.3s ease for layout, 0.2s ease-in-out for interactive elements (links, buttons)
5. **No container chrome**: Components should be transparent on the body parchment. Use ruled lines (1-2px sepia ink borders) for structure, not distinct backgrounds or gradient stacks.

## Key Color Tokens

| Token | Purpose |
|-------|---------|
| `brand.parchment` | Page background (body) |
| `brand.inkDark` | Primary text, headings |
| `brand.inkMedium` | Sepia ink borders, dividers, structural lines |
| `brand.inkMuted` / `brand.inkLight` | Secondary text, subtle borders |
| `brand.redChalk` | Page-level emphasis, focus states, winner marks, interactive accents |
| `brand.gold` / `brand.bronze` | Cover only (TopBar) — never on pages |
| `brand.win` / `brand.loss` | Match result status |
| `brand.stone` / `brand.stoneLight` | Neutral surfaces |

## Surface Treatment

Components are transparent on the body parchment. Structure comes from:
- 1px sepia ink borders (`rgba(107, 82, 64, 0.5)`) for containers like PlayerStats, RankingCard
- Ruled bottom lines (1-2px `brand.bronze` or `brand.inkMedium`) for section headers and row dividers
- Red chalk (`brand.redChalk`) for emphasis marks (winner left border, focus states)

Dark mode strips textures (`backgroundImage: 'none'`) and uses flat slate colors.

## Typography

- Font: `'Lora', serif` (set globally)
- Base size: 15px
- Headings: `brand.inkDark`, weight 600
- Links: `brand.linkDefault` / `brand.linkHover`
