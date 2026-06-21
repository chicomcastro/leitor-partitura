# ADR 010 — UX Feedback Round (Safe Area, Modal Improvements, Scroll Fix)

**Status**: Accepted  
**Date**: 2026-06-20

## Context

After real-device testing on a tablet, five UX issues were identified:

1. App content renders behind the device status bar (no safe area insets)
2. Can't create a playlist from the add-to-playlist modal — must go back and create first
3. Adding scores to a playlist one-by-one is tedious for bulk operations
4. Clickable playlist names in modal don't signal interactivity — unclear affordance
5. Half-page scroll overshoots, losing a line of music

## Decisions

1. **Safe area**: Apply `env(safe-area-inset-*)` via `calc()` on individual chrome elements (Library header/tabs/playlistBar/content, Reader topBar/bottomBar) rather than on `#root`. This avoids conflicts with `position: absolute; inset: 0` layouts while correctly pushing content away from notches and status bars.

2. **Inline playlist creation**: Added a text input + create button below the playlist list in `AddToPlaylistModal`. The "no playlists" empty state now shows a hint instead of blocking the user.

3. **Bulk add**: Added a "Add scores" button in the playlist action bar that opens a multi-select modal with checkboxes for all scores.

4. **Checkbox UX**: Replaced clickable button-style playlist items with `<label>` + `<input type="checkbox">` for clear selection affordance. Uses `:has(input:checked)` for active styling.

5. **Half-page scroll**: Changed from `pageElement.offsetHeight * 0.5` to `viewport.clientHeight * 0.47`. Using viewport height ensures the scroll distance matches what the user sees, and the 0.47 factor provides a safety margin to avoid overshooting.
