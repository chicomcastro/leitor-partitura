# ADR 016: Touch-friendly drag reordering

## Status
Accepted

## Context
Playlist and playlist-item reordering used the HTML5 Drag and Drop API
(`draggable` + `dragstart/dragover/drop`). That API does not fire for touch
input, so on tablets/phones — the primary target — reordering simply did not
work. ADR 012 noted this as a follow-up.

## Decision
Replace HTML5 DnD with a **Pointer Events** based reorder that works for touch
and mouse alike:

- `src/lib/dragReorder.js` — pure, tested helpers: `reorder(list, from, to)` and
  `indexFromPoint(x, y, rects)` (nearest rect center; handles both vertical lists
  and wrapping grids).
- `src/hooks/useDragReorder.js` — a hook exposing `containerRef`, `handleProps(index)`
  and `active` ({ from, over }). It uses pointer capture so the drag keeps
  tracking outside the handle, and reads child rects marked with `data-reorder`.
- Each reorderable row/card gets a dedicated **drag handle** (grip icon) with
  `touch-action: none`, so dragging never hijacks taps or list scrolling.
- Visual feedback: the dragged item dims; the drop target shows an insertion line.

Applied to the sidebar playlist list (`onReorderPlaylists`) and to playlist items
(`onReorderPlaylist`). Reordering is disabled while a search query is active
(rendered order ≠ stored order).

## Consequences
- Reordering works on touch devices, matching the tablet-first goal.
- Pointer events cover mouse too, so the HTML5 DnD code is removed entirely.
- Keyboard reordering is still not supported (was not before either) — a future
  accessibility improvement.
