# ADR 022: Daily goal & weekly recap (stats phase 3)

## Status
Accepted (builds on ADR 020/021)

## Context
Phase 3 of stats adds two habit/engagement mechanics on top of the local stats:
a **daily practice goal** and an automatic **weekly recap** with a shareable
card — keeping everything on-device.

## Decision
- **Daily goal.** `sp.goalMin` (minutes/day, default 0 = off). The Stats screen
  offers Off/15/30/45/60 and, when set, shows today's progress bar
  (`goalProgress` / `todayMs`, pure helpers in `lib/stats.js`) with a
  "goal reached" state. Backed up via `.estante`.
- **Weekly recap.** New pure helpers `startOfWeek` (Monday), `weekId`,
  `weekSummary` (ms / active days / top piece for a Mon–Sun window). On the first
  library visit of a new week (`sp.lastRecapWeek` differs from the current
  `weekId`), if the previous week had any practice, a `RecapModal` summarizes it
  with a one-tap shareable recap card; otherwise the week marker advances
  silently. It never appears while a milestone celebration is pending
  (milestone takes priority; recap shows next).
- **Share card.** `drawShareCard` made the week/streak line optional and gained a
  `subtitle`, so the recap card reuses the same renderer with "Last week" as the
  hero and "N active days" as the subtitle.

## Consequences
- A daily target (habit loop) and a recurring weekly moment (retention + sharing)
  with zero backend/privacy cost.
- Recap and milestone modals are coordinated so only one shows at a time.
- Future (phase 4 ideas): monthly "wrapped", goal streaks/notifications,
  more card themes.
