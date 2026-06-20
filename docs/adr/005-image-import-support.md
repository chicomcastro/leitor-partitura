# ADR 005 — Image Import Support

## Status
Accepted

## Context
Many musicians have sheet music as scanned images (JPG/PNG) rather than PDFs. The app only supported PDF import, forcing users to convert images to PDF first.

## Decision
Accept image files (JPG, PNG, WEBP, GIF, BMP, SVG) alongside PDFs. Images are stored in the same IndexedDB `pdfs` store and treated as single-page scores. A `type` field (`'pdf'` or `'image'`) in the score metadata controls rendering path. Existing scores without a `type` field default to `'pdf'` for backward compatibility.

## Consequences
- Library thumbnails render via `<img>` (object URL from IndexedDB) for images, canvas + pdf.js for PDFs
- Reader skips pdf.js entirely for images, displaying a single full-width `<img>`
- Annotations work on images the same way as PDF pages (canvas overlay)
- No additional dependencies required
