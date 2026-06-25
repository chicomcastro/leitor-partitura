# ADR 020: Practice statistics (local) + shareable card

## Status
Accepted

## Context
We want an Statistics screen to drive engagement and word-of-mouth marketing,
with **practice time** as the headline metric, plus streaks, most-practiced
pieces, top composer and an activity heatmap — and a **shareable image** for
social media. It must respect the product's core promise: offline, no account,
no cloud.

## Decision
Everything is computed and stored **locally**; nothing is uploaded.

- **Collection.** A `usePracticeTracker` hook runs in the Reader and counts time
  only while the tab is visible and there was interaction in the last minute
  (pausing on `visibilitychange`/idle and guarding against large sleep gaps), so
  the numbers are honest. It flushes accumulated ms to `App.recordPractice`,
  which folds it into `localStorage` `sp.stats`. Opens are counted in `openScore`.
- **Shape.** `{ days: { 'YYYY-MM-DD': { ms, byScore } }, views: { id: n } }` —
  day buckets keep storage tiny and make streak/heatmap/range trivial.
- **Aggregation.** Pure, unit-tested helpers in `lib/stats.js` (total, range,
  streak, heatmap, top scores/composers, duration formatting).
- **Screen.** A "Estatísticas" entry in the Library sidebar renders `StatsView`:
  hero practice time, streak, active days, library/recorded totals, a 16-week
  heatmap, top pieces (bars) and top composer.
- **Shareable card.** `lib/shareCard.js` draws a 1080×1080 branded PNG on a
  Canvas (TapScore mark + wordmark, practice time hero, streak, top piece/
  composer, watermark URL) and shares it via the Web Share API
  (`navigator.share({files})`) with a download fallback — the same pattern used
  for playlist export.
- **Backup.** `sp.stats` (and `sp.anchors`) are added to the backup keys, so
  stats travel with the `.estante` export between devices.

## What we deliberately did NOT do
- No backend, accounts, cloud sync or leaderboards (breaks the offline/no-signup
  promise; privacy).
- No audio-based "accuracy/score" — we don't analyze audio, so it would be fake.
- No per-event instrumentation (page turns, etc.) — only session time + opens.
- Positive framing only — no "you practiced less" guilt metrics.

## Consequences
- Engagement features (streaks, recap card) with zero privacy cost.
- Practice time in playlists is attributed to the opened score (good enough for
  v1; finer per-piece attribution within a continuous playlist view is future
  work).
- Phase 2 ideas: milestone/celebration cards, automatic weekly recap.
