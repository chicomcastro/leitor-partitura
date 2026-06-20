# ADR 007 — Backup/Restore via .estante File

## Status
Accepted

## Context
Data lives entirely in the browser (localStorage + IndexedDB). Users risk losing everything if they clear browser data, switch devices, or reinstall. A cloud sync would require a backend.

## Decision
Export/import all data as a single `.estante` file (JSON containing base64-encoded binaries). No external dependencies — pure browser APIs. The file includes localStorage settings, PDF/image buffers, and audio recordings.

## Consequences
- Zero-infrastructure backup — no server, no accounts
- Large libraries produce large files (base64 adds ~33% overhead), but this is acceptable for the use case
- Import triggers `window.location.reload()` to re-initialize all React state from storage
- Custom `.estante` extension avoids confusion with other file types
