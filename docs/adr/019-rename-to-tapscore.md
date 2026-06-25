# ADR 019: Rename brand to "TapScore"

## Status
Accepted (supersedes the name decision in ADR 018; the visual identity stands)

## Context
ADR 018 consolidated the brand on "Estante". On reflection that name is a common
Portuguese word (bookshelf / music stand) and not distinctive enough to own. A
compound, product-style name fits the category better (cf. forScore,
MobileSheets, MuseScore).

## Decision
Rename the product to **TapScore** — *tap* (the touch interaction central to a
tablet reader: tap to turn / play) + *score* (sheet music). It is short,
distinctive, works in PT and EN, reads as a product, and avoids clashing with
the common-word problem.

The visual identity from ADR 018 is kept: the staff-lines + note-head mark and
the red (#E73B4C) palette still fit "score". Because the app icons/favicon carry
no text, only the **og-image** wordmark was regenerated; `icon-192/512` and
`favicon.svg` are unchanged.

Updated: PWA manifest (`name`, `short_name` = "TapScore"),
`apple-mobile-web-app-title`, `<title>`, OG/Twitter titles, the in-app wordmark
(`library.title`) in both locales, and the landing footer lockup.

## Backward compatibility
The backup file extension remains **`.estante`** so existing user backups keep
importing; only the suggested download filename prefix changed to
`tapscore-backup-`. The repository slug and base path (`/leitor-partitura/`) are
unchanged.

## Consequences
- The app now installs and presents as **TapScore**.
- "Estante" survives only as the legacy backup extension and as common-noun copy
  where it means "music stand", not the brand.
- Users with the old PWA installed may need to remove and re-add it to refresh
  the home-screen name.
