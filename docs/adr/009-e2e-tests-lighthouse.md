# ADR 009 — E2E Tests and Lighthouse CI

## Status
Accepted

## Context
The app has no automated tests. Manual testing on every change is error-prone, especially for the onboarding flow, language switching, and core navigation.

## Decision
- **Playwright** for E2E tests against the Vite preview server. Tests cover: onboarding flow (show, dismiss, navigate steps), Library UI (search, tabs, import/playlist buttons), and language toggle.
- **Lighthouse CI** via `treosh/lighthouse-ci-action` in the GitHub Actions deploy workflow. Asserts minimum scores for performance (0.8 warn), accessibility (0.9 error), best practices (0.9 warn), and PWA (0.7 warn).

## Consequences
- Playwright runs locally via `npm run test:e2e`; not in CI yet (would need Chromium install step)
- Lighthouse CI runs on every push to main, before deploy
- Accessibility score threshold enforces ARIA and contrast standards
