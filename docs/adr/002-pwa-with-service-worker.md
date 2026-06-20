# ADR 002: PWA with Service Worker

## Status
Accepted

## Context
Musicians use the app on tablets during rehearsals and performances. They need:
- An app icon on the home screen (no "open browser → navigate to URL" friction)
- Offline access (venues often have poor connectivity)
- Fullscreen standalone display (no browser chrome eating screen space)

## Decision
Use vite-plugin-pwa with Workbox for automatic service worker generation:
- `registerType: 'autoUpdate'` — updates install silently in background
- Cache-first for Google Fonts (365d TTL)
- All static assets (JS, CSS, HTML, PNG, SVG, woff2) are precached
- Web app manifest with `display: standalone` and `orientation: any`

## Consequences
- App is installable as PWA on iOS, Android, and desktop
- Works fully offline after first visit
- Updates are transparent — no "new version available" prompts
- Icon assets (192px, 512px) need to be generated
