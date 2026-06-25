# ADR 021: Practice milestones & celebrations (stats phase 2)

## Status
Accepted (builds on ADR 020)

## Context
Phase 1 (ADR 020) added local practice stats and a shareable card. To drive
engagement and organic sharing we want **celebratory milestone moments**
("🔥 7-day streak", "10h practiced") and more accurate per-piece attribution.

## Decision
- **Milestones** (`lib/milestones.js`, pure + tested): streak thresholds
  (3/7/14/30/100) and total-hours thresholds (1/5/10/25/50/100), ordered by
  significance. `pickCelebration(stats, now, seen)` returns the most significant
  *unseen* achieved milestone.
- **Seen set** persisted in `localStorage` `sp.statsMilestones`. When the user
  returns to the library (never mid-practice), App checks for a fresh milestone
  and shows a `MilestoneModal` with the emoji, headline and a one-tap
  **shareable card** (the Phase 1 card with an achievement badge pill). On
  dismiss, all currently-achieved milestones are marked seen.
- **Per-piece attribution.** The Reader now tracks the piece currently on screen
  (`currentScoreIdRef`, updated by the same scroll logic that sets the piece
  name) and attributes practice time to it — so time in a playlist counts toward
  the piece you're actually reading, not just the one you opened.
- Share-card `drawShareCard` gained an optional `badge` for the milestone label.
- `sp.statsMilestones` is included in the `.estante` backup.

## Consequences
- Positive, shareable moments without nagging (shown once, on return to library).
- Retroactive milestones (from pre-existing stats) celebrate once then mark all
  achieved as seen, avoiding a flood.
- Future (phase 3 ideas): automatic weekly recap, monthly "wrapped", more badges.
