# ADR 001: Migrate from bundled HTML to Vite + React

## Status
Accepted

## Context
The original app was a single 930KB HTML file using a custom framework (DCLogic) with inline CSS and embedded base64 assets. This made it impossible to:
- Review diffs (every change = 930KB diff on a single line)
- Collaborate or accept contributions
- Add tests or CI
- Use any development tooling (linting, type checking, HMR)

## Decision
Migrate to Vite + React 19 with CSS Modules. Key choices:
- **React 19** — the app already used JSX via Babel transform; React is the natural evolution
- **Vite** — zero-config for React, fast HMR, optimized builds, easy GitHub Pages deploy
- **CSS Modules** — co-located styles with zero runtime cost; replaces inline styles while keeping scoping
- **pdfjs-dist via npm** — replaces CDN fallback with proper dependency management
- **Google Fonts CDN** — replaces embedded woff/woff2 blobs for Montserrat

## Consequences
- The old bundled HTML is preserved for reference but no longer the source of truth
- All features are migrated: library, reader, metronome, gestures, recordings, playlists, markers
- IndexedDB schema is unchanged — existing user data is preserved
- localStorage keys are unchanged — settings carry over
