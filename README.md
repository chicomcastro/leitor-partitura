# Estante — Leitor de Partituras

A free, open-source web app for reading sheet music on tablets during rehearsals and performances. No accounts, no subscriptions — your scores stay on your device.

**[Open the app](https://chicomcastro.github.io/leitor-partitura/)**

## Features

- **PDF & Image import** — Load PDFs or scanned images (JPG, PNG) of your sheet music
- **Touch gestures** — Configure tap zones and swipes for hands-free page turning
- **Dual-page landscape** — Two pages side by side when you rotate your tablet
- **Metronome** — Built-in metronome with tap tempo and time signature
- **Annotations** — Draw directly on your scores with multiple colors and eraser
- **Bookmarks & markers** — Jump to specific sections instantly
- **Playlists** — Organize pieces for setlists and rehearsals with drag-and-drop reorder
- **Auto-scroll** — Configurable speed for continuous scrolling
- **Audio recording** — Record rehearsals directly in the app
- **Backup/restore** — Export and import all your data as a single `.estante` file
- **Keyboard & pedal support** — Arrow keys, PageUp/PageDown for Bluetooth pedals
- **Works offline** — PWA with service worker, install on your home screen
- **Bilingual** — Portuguese (BR) and English

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:5173/leitor-partitura/` in your browser.

## Tech Stack

- **React 19** + **Vite**
- **pdf.js** for PDF rendering
- **IndexedDB** for file storage, **localStorage** for settings
- **CSS Modules** + design tokens
- **PWA** with Workbox via vite-plugin-pwa
- Deployed via **GitHub Actions** to **GitHub Pages**

## Building

```bash
npm run build    # Production build in dist/
npm run preview  # Preview the production build locally
```

## Architecture

```
src/
  screens/        Library (score grid) and Reader (PDF viewer)
  components/     Modal, MetronomePanel, GesturesPanel, RecordingsPanel, Onboarding
  hooks/          usePersistedState, useMetronome, useRecorder, useAnnotations
  lib/            db (IndexedDB), pdf (pdf.js wrapper), storage, backup, i18n
  styles/         Design tokens and global styles
docs/adr/         Architecture Decision Records
```

## License

MIT
