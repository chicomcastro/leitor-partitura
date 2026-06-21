# ADR 013: Unit testing with Vitest and sticky PR coverage

## Status
Accepted

## Context
The project had Playwright e2e smoke tests but no unit tests and no coverage
instrumentation, so regressions in logic (storage, backup, library filtering)
could land unnoticed. We wanted a low-friction way to grow coverage and to
*track its variation per PR*.

## Decision
- **Vitest** (jsdom environment) as the unit runner — it reuses the existing
  Vite/React config and is near-zero setup.
- **`@vitest/coverage-v8`** for coverage; reporters `text` + `json-summary`
  (+ `html` locally). Scope is all of `src/**` so the number is honest.
- **`fake-indexeddb`** in `src/test/setup.js` so the IndexedDB-backed layers
  (`db`, `backup`) run headless.
- Tests are co-located as `*.test.js` next to the code.
- A CI **`coverage` job** runs `vitest --coverage`, uploads `coverage-summary.json`
  as an artifact (so each `main` run becomes a baseline), downloads the latest
  `main` summary to compute a delta, and posts/updates a **single sticky PR
  comment** (hidden marker `<!-- coverage-report -->`) via `actions/github-script`.

## Consequences
- Coverage is visible and diffable on every PR without a third-party service.
- Baseline started low (~6%, only `lib/` covered) by design — it climbs as
  tests are added; the sticky comment shows the trend.
- The sticky comment requires `pull-requests: write`; it degrades gracefully
  (shows `—` for the delta) when no base artifact exists yet.
- Coverage **thresholds** (`vitest.config.js`) fail the build if coverage drops
  meaningfully below current levels (lines/statements 28%, functions 35%,
  branches 60%). They are set with margin and should be raised as coverage grows.
- Component tests use **@testing-library/react** (jsdom); the vitest config sets
  `esbuild.jsx: 'automatic'` so JSX in source/test files transforms correctly.
