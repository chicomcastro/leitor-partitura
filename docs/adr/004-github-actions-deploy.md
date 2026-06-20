# ADR 004: CI/CD with GitHub Actions → Pages

## Status
Accepted

## Context
Deploy was manual — serve the HTML file somehow. No CI, no automated checks.

## Decision
GitHub Actions workflow on push to `main`:
1. Install dependencies (`npm ci`)
2. Build (`vite build`)
3. Deploy to GitHub Pages via `actions/deploy-pages`

Base URL configured as `/leitor-partitura/` to match the GitHub Pages path.

## Consequences
- Every push to main auto-deploys
- Build failures block deploy
- App available at `https://chicomcastro.github.io/leitor-partitura/`
- Future: add lint, type-check, and test steps before build
