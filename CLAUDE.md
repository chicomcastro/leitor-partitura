# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Estante** — a free, offline-first web sheet music reader for musicians on tablets. Alternative to forScore/MobileSheets. Deployed via GitHub Pages at `chicomcastro.github.io/leitor-partitura/`.

## Commands

```bash
npm run dev        # Vite dev server at localhost:5173/leitor-partitura/
npm run build      # Production build → dist/
npm run preview    # Preview production build
npm test           # Unit tests (Vitest, jsdom)
npm run coverage   # Unit tests + v8 coverage report → coverage/
npm run test:e2e   # Playwright end-to-end tests
```

If `npx vite` doesn't work, use `./node_modules/.bin/vite` directly.

Unit tests live next to the code as `*.test.js` under `src/`. CI runs them with
coverage and posts a sticky coverage comment on each PR (see `.github/workflows/ci.yml`
and `scripts/coverage-comment.mjs`). IndexedDB is provided in tests via `fake-indexeddb`.

## Architecture

**Vite + React 19** app with CSS Modules and no state management library.

### Data Flow
- All app state lives in `App.jsx` using `usePersistedState` (useState + localStorage sync)
- Binary data (PDFs, images, recordings) stored in IndexedDB (`partituras-db` v1, stores: `pdfs`, `recordings`)
- Settings stored in localStorage under `sp.*` keys
- Scores have a `type` field: `'pdf'` (default) or `'image'`

### Key Files
- `src/App.jsx` — Root component, all top-level state and callbacks
- `src/screens/Library.jsx` — Score grid, playlists, search, drag-and-drop reorder
- `src/screens/Reader.jsx` — PDF/image viewer with imperative DOM (builds viewer via useEffect, not JSX)
- `src/lib/db.js` — IndexedDB wrapper (idbPut, idbGet, idbDel, idbGetAll)
- `src/lib/pdf.js` — pdf.js wrapper with document cache
- `src/lib/backup.js` — Export/import .estante backup files
- `src/lib/i18n.jsx` — React Context i18n provider (PT-BR + EN)

### Reader internals
The Reader builds its DOM imperatively in a useEffect. Pages are `<div>` wrappers with canvases rendered lazily via IntersectionObserver. Annotations use transparent canvas overlays. Dual-page mode activates when `containerWidth > containerHeight * 1.3` and fitMode is 'page'.

### PWA
Configured via `vite-plugin-pwa` with Workbox. Manifest in `vite.config.js`. Icons in `public/`.

## Conventions
- PT-BR is the default locale; all new strings need entries in both `pt-BR` and `en` objects in `src/lib/i18n.jsx`
- Base URL is `/leitor-partitura/` (set in vite.config.js)
- ADRs in `docs/adr/` for significant decisions
- No external CSS framework — design tokens in `src/styles/tokens.css`
