# ADR 015: Navigation transitions via the View Transitions API

## Status
Accepted

## Context
Opening a score and returning to the library swapped the React tree instantly,
which felt abrupt and web-like rather than native. We wanted a smooth transition
without pulling in an animation library or restructuring the App's conditional
rendering.

## Decision
Use the native **View Transitions API** as a progressive enhancement. App-level
navigation (`openScore`, `backToLibrary`) runs the state change inside
`document.startViewTransition(() => flushSync(apply))` when available; otherwise
it applies instantly. A default `root` cross-fade + subtle slide-up is defined in
`global.css`, and disabled under `prefers-reduced-motion`.

## Consequences
- Smooth Library↔Reader transitions in supporting browsers (Chromium, Safari 18+),
  graceful instant fallback elsewhere — no new dependency.
- `flushSync` is required so the transition snapshot captures the new DOM.
- Respects reduced-motion preferences.
