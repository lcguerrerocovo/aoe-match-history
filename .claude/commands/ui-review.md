---
description: Annotate UI components and get targeted fixes or design exploration
---

# UI Review — $ARGUMENTS

You are running the UI Review workflow. The user wants to review and improve the **$ARGUMENTS** view.

## View Mapping

```
landing    → /                        → LandingPage
profile    → /profile_id/:profileId   → App (ProfileHeader, FilterBar, MatchList)
match      → /match/:matchId          → MatchPage (FullMatchSummaryCard, ApmBreakdownChart)
```

## Workflow

### 0. Handle `clear` Argument

If `$ARGUMENTS` is `clear`:
1. Delete `.ui-review/annotations.json` from the project root (if it exists)
2. If the dev server is running, also call: `curl -s -X POST http://localhost:5173/__ui-review/clear`
3. Respond: "Annotations cleared." and stop — do not continue to subsequent steps.

### 1. Validate

- Check that the Vite dev server is running: `curl -s http://localhost:5173/ > /dev/null`. If it fails, tell the user: "Start the dev server first: `cd ui && npm run dev`"
- Validate that the view argument matches one of the view mapping keys above. If not, list the valid views and also mention `/ui-review clear` to clear existing annotations.
- Check that the component files for this view exist. If any are missing, warn: "[ComponentName].tsx not found — view mapping may be stale."

### 2. Clear Previous Annotations

```bash
curl -s -X POST http://localhost:5173/__ui-review/clear
```

### 3. Activate Overlay

```bash
curl -s -X POST http://localhost:5173/__ui-review/activate -H 'Content-Type: application/json' -d '{"view": "$ARGUMENTS"}'
```

### 4. Wait for User

Tell the user:

> **Overlay is active on the $ARGUMENTS view.** Open your browser, annotate what you'd like changed (click labels to annotate, Enter to save), then come back here and press Enter when done.

Wait for the user to press Enter (use the ask_user tool or equivalent to pause).

### 5. Read Annotations

Read the file `.ui-review/annotations.json` from the project root. If it's empty or doesn't exist, respond: "No annotations found. Did you forget to save, or does it look good?"

### 6. Triage

Classify each annotation as either:

- **Direct fix** — The note maps to a clear, specific code change. Examples: "wrong color", "text too bold", "too much padding", "remove this", "make this smaller", "align left", "wrong font"
- **Explore** — The note needs design discussion or multiple options. Examples: "rethink this layout", "doesn't feel right", "add something here", "this section needs work", "improve the hierarchy"

Show the user the triage:

```
Direct fixes:
- TeamCard: "header text should be bolder" → will update font-weight
- MapCard: "too much padding" → will reduce padding

Explore:
- ProfileHeader: "rethink the layout" → will open visual companion
```

### 7. Execute Direct Fixes

For each direct fix:
1. Find the component file
2. Make the specific code change
3. List what was changed

### 8. Handle Explore Items

If there are explore items, check if the visual companion (brainstorming skill) is available.

**If available:** Use the visual companion / brainstorming skill to generate 2-3 HTML mockup options for each explore item. Present them to the user. Implement the chosen option.

**If not available:** For each explore item, describe 2-3 text-based options and ask the user to pick. Implement the chosen option.

### 9. Loop

After all changes are made, tell the user:

> Changes applied. Check the UI in your browser. Run `/ui-review $ARGUMENTS` again if anything else needs work.

## Important Notes

- Always read the actual component code before making changes
- Use theme tokens from `ui/src/theme/theme.ts` — never hardcode colors
- Use `useLayoutConfig()` from `ui/src/theme/breakpoints.ts` for responsive values
- The overlay depends on `@vitejs/plugin-react` (Babel) for component displayNames
- The explore path uses the brainstorming skill from the superpowers plugin — it's optional, the overlay + direct fixes work without it
