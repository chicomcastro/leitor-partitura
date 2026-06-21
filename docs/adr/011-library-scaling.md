# ADR 011: Library scaling — score metadata, search, sort & tags

## Status
Accepted

## Context
The library was a flat list of scores with only `name` and `pages`. Search
filtered the active tab by name substring; there was no sorting, no tags, no
favorites and no notion of "recently opened". For a musician with hundreds of
scores this does not scale — finding the right piece means scrolling.

See `docs/ux-review/README.md` for the diagnosis and visual evidence.

## Decision
Extend the score model with optional metadata and add pure, tested helpers to
drive search/sort/filter.

- **Score metadata** (all optional, defaulted at read time — no destructive
  migration): `composer` (string), `tags` (string[]), `favorite` (bool),
  `lastOpenedAt` (epoch ms, set by `openScore`).
- **`normalizeScore`** fills defaults so legacy persisted scores keep working.
- **Global search** matches name **or** composer **or** tag, case-insensitive,
  and also filters the playlist list in the sidebar.
- **Sorting**: `recent` (default), `added`, `name`, `pages` — persisted in
  `localStorage` under `sp.sort`.
- **Tag filtering**: chips above the grid; selecting several requires *all*
  (AND), matching the mental model of narrowing down.
- **Favorites / Recents** are derived views (not separate storage).
- All logic lives in `src/lib/library.js` as side-effect-free functions, unit
  tested in `src/lib/library.test.js`.

Editing metadata is done through an "Edit score" modal (name, composer, tags);
favoriting is a one-tap star on each card.

## Consequences
- No migration needed; old scores render and gain metadata when edited.
- Coverage of `src/lib` rises (pure helpers are cheap to test).
- The `sp.scores` localStorage shape grows but stays backward compatible.
- Future work (backlog): fuzzy search, saved filters, virtualized grid for very
  large libraries.
