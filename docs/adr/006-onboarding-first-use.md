# ADR 006 — Onboarding First-Use Flow

## Status
Accepted

## Context
New users landing on an empty library have no guidance on what the app does or how to start. This is critical since the app targets musicians who may not be tech-savvy.

## Decision
Show a 3-step onboarding modal on first visit when the library is empty: (1) import sheet music, (2) configure gestures, (3) ready to rehearse. The last step offers an "Import" CTA that opens the file picker directly. Dismissal state is persisted in localStorage (`sp.onboarding`). The onboarding never shows again once dismissed or once the user has scores.

## Consequences
- Zero-config: no account or setup required, just a lightweight walkthrough
- Low cognitive load: 3 focused steps, skippable at any time
- Stored in localStorage (not IndexedDB) since it's a simple boolean flag
