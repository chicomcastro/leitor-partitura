# ADR 003: Design tokens via CSS custom properties

## Status
Accepted

## Context
The original app used hardcoded hex values in inline styles (e.g., `#0D111C`, `#161C2A`, `#E73B4C`) repeated hundreds of times. No central source of truth for colors, spacing, or typography.

## Decision
Define design tokens as CSS custom properties in `src/styles/tokens.css`:
- Semantic color names: `--ground`, `--surface`, `--accent`, `--text-muted`, etc.
- Typography: `--font` (Montserrat)
- Border radii: `--radius-sm` through `--radius-xl`

All components reference tokens via `var(--token-name)`. No hardcoded colors in component CSS.

## Consequences
- Single file to update for palette changes
- Enables future theming (light mode, high contrast)
- CSS Modules compose with tokens naturally
- Token file is small (~30 lines) and self-documenting
