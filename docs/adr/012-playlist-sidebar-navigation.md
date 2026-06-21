# ADR 012: Playlist navigation — sidebar instead of tabs

## Status
Accepted

## Context
Playlists were rendered as a horizontal, scrollable tab strip. With ~10
playlists the tabs already overflowed the viewport edge with no affordance to
reach the rest (see `docs/ux-review/02-library.png`), and there was no way to
search, reorder, recolor or rename them. This is the main scalability blocker
for real-world use (dozens to hundreds of playlists).

## Decision
Replace the tab strip with a persistent **left sidebar** that scales:

- A single **global search** at the top filters both the playlist list and the
  scores in the main area.
- Fixed nav entries with live counts: **All scores**, **Favorites**, **Recent**.
- A scrollable **playlist list**; each row has a color dot, name, item count and
  an inline edit affordance. Rows are **drag-reorderable** (`onReorderPlaylists`).
- Playlists carry a `color` (assigned round-robin on creation) and can be
  **renamed / recolored / deleted** via an "Edit playlist" modal.
- On narrow screens (≤ 860px) the sidebar becomes an off-canvas **drawer**
  toggled by a hamburger, with a scrim — preserving the native-app feel on
  phones while keeping tablets/desktop a two-pane layout.
- Playlist-specific actions (play, bulk add, share, delete) move into the main
  content header when a playlist is active, keeping the sidebar for navigation
  only (lower cognitive load).

`activePlaylist` still means "a real playlist is open" (consumed by the Reader);
a local `section` state tracks the All/Favorites/Recents selection when no
playlist is active.

## Alternatives considered
- **Keep tabs + add a "more" overflow menu** — still poor for many playlists,
  no search/reorder.
- **Folders/hierarchy** — more powerful but heavier cognitively; deferred. Tags
  on scores already cover most grouping needs.

## Consequences
- Scales to many playlists (scroll + search + reorder).
- Larger change to `Library.jsx` layout and CSS; the e2e "tabs" check was
  updated to assert the new sidebar nav.
- Drag-to-reorder is pointer/mouse oriented; touch reordering is a follow-up.
- Playlist `color` is additive to the persisted shape; older playlists fall back
  to the first palette color.
