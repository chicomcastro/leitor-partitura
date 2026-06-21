# ADR 014: In-app toasts and confirm dialog

## Status
Accepted

## Context
The app used the browser's blocking `window.confirm()` and `window.alert()` for
destructive confirmations (delete score/playlist, remove from playlist) and for
feedback (backup/share errors, import success, mic permission). These break the
native-app feel, are unstyled, block the main thread, and look out of place on a
tablet PWA.

## Decision
Add a small `UIProvider` (`src/lib/ui.jsx`, mounted inside `I18nProvider`)
exposing two hooks:

- **`useToast()`** → `toast(message, { type, duration })` renders a transient,
  tappable toast (info/success/error) in a bottom-center stack with auto-dismiss.
- **`useConfirm()`** → `confirm({ title, message, confirmLabel, cancelLabel, danger })`
  returns a Promise that resolves `true`/`false`, backed by a styled modal.

Both fall back gracefully when used outside the provider (toast = no-op,
confirm = native `window.confirm`), which keeps unit tests simple.

All `confirm()`/`alert()` call sites (Library cards, playlist delete/edit,
backup/share feedback, recorder mic error) were migrated. Default button labels
are i18n-aware (`modal.cancel`, `modal.confirm`).

## Consequences
- Consistent, branded, non-blocking UX that matches the rest of the app.
- Component-level tests now exist (Testing Library added); coverage rises.
- New strings: `modal.confirm`, `reader.micError` (PT-BR + EN).
- Future: could extend toasts with actions (e.g. "undo delete").
