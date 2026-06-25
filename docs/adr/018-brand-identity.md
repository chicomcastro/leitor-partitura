# ADR 018: Brand identity — "Estante"

## Status
Accepted

## Context
The app shipped with a split identity: the UI, page title and Open Graph tags
already said **"Estante"**, but the PWA manifest used the generic name
**"Partitura"**. So installing to the home screen produced a generic-looking
"Partitura" icon/label, and there was no distinctive logo mark (the icon was a
stock music-note glyph). The product needed one coherent brand.

## Decision
Consolidate on **"Estante"** as the product name (Portuguese for a music
stand / bookshelf — it matches the metaphor of a shelf of sheet music and was
already used throughout the UI). No invented name; we strengthen the existing one.

**Brand mark.** A custom glyph: abstract **staff lines + a note head**, evoking a
shelf of sheet music. White on a rounded-square tile with a red gradient
(#F2495A → #D63344, around the existing accent #E73B4C). Implemented once as
`src/components/BrandMark.jsx` and reused in the Landing hero and Library header.

**Color.** Brand red `#E73B4C` (unchanged accent), on the dark ground `#0D111C`.

**Assets regenerated** from the mark: `favicon.svg`, `icon-192.png`,
`icon-512.png` (full-bleed tile, content within the maskable safe zone) and a
branded `og-image.png` (mark + wordmark + tagline).

**Install name.** Manifest `name` = "Estante — Leitor de Partituras",
`short_name` = "Estante"; plus `<meta name="apple-mobile-web-app-title"
content="Estante">` so iOS home-screen installs read "Estante" instead of the
long title or the old generic name.

## Consequences
- Installing the PWA now shows the "Estante" name and the custom mark.
- One source of truth for the logo (`BrandMark`), consistent across screens.
- The repository name and base path (`/leitor-partitura/`) are unchanged — brand
  name and repo slug are intentionally decoupled.
- Icons are generated via a Playwright script from the SVG; if the mark changes,
  re-run it to refresh the PNGs (documented in the PR).
