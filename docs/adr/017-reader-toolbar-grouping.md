# ADR 017: Reader toolbar grouping

## Status
Accepted

## Context
The Reader's bottom toolbar showed up to ~9 unlabeled icon buttons in a single
row (autoscroll, speed, metronome, record, recordings, annotate, anchor-edit,
gestures, add-to-playlist). On smaller tablets this crowded the bar and, with no
labels, discoverability relied on trial and error (backlog C2/C5).

## Decision
Keep the **primary, frequently-used** controls visible and move secondary ones
into a labeled overflow menu:

- Always visible: autoscroll (play/pause), speed slider, metronome, record, and
  a **"more tools" (⋯)** button. The anchor-edit toggle remains visible only in
  anchor scroll mode (contextual).
- The ⋯ button opens a popover **menu with icon + label** rows: Annotate,
  Recordings, Gestures, Add to playlist. Labels double as the discoverability fix
  (C5). The button highlights when annotate is active so state isn't hidden.
- The menu closes on item selection, outside click (scrim), or Escape.

## Consequences
- The toolbar drops from ~9 to ~5 controls, reducing visual load on tablets.
- Secondary actions are now labeled, improving discoverability.
- Slightly more taps to reach secondary tools — an acceptable trade for clarity,
  since they are used less often than page turning / autoscroll / metronome.
