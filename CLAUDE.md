# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Leitor de Partituras — a sheet music reader/player web app. The entire application lives in a single self-contained HTML file (`Leitor de Partituras.html`) that uses a bundler bootstrap pattern to unpack embedded assets at runtime.

## Architecture

The app is a **single bundled HTML file** (~930KB) with no external build system, no `package.json`, and no separate source files. The HTML file contains:

1. **Bundler bootstrap** (lines 1–170): A loader script that unpacks base64-encoded, gzip-compressed assets from embedded JSON manifests and reconstructs the full page at runtime.
2. **`__bundler/manifest`** (line 174): JSON mapping UUIDs to assets — JS libraries, fonts (Montserrat via woff/woff2).
3. **`__bundler/ext_resources`** (line 178): External resource references.
4. **`__bundler/template`** (line 182): The actual app HTML/CSS/JS as a JSON-encoded string, using React (via Babel `text/babel` transform) with JSX.

**Key technical details:**
- React with in-browser Babel JSX transformation (`text/babel` scripts)
- IndexedDB + localStorage for persistence
- AudioContext (Web Audio API) for playback
- Canvas for rendering
- PDF support for import/display
- `getUserMedia` for camera access (likely for scanning sheet music)

## Development

There is no build step. To work on this app:

- Open the HTML file directly in a browser (`open "Leitor de Partituras.html"`)
- All changes happen within the single HTML file — the template string inside `__bundler/template` contains the actual application code
- The bundler bootstrap decompresses and injects assets on `DOMContentLoaded`

**Warning:** The template is stored as a JSON-encoded string inside a `<script>` tag. Edits to application logic require modifying this encoded content carefully, or extracting/re-encoding the template.
