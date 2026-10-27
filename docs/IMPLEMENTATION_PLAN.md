# Implementation Plan — Local YouTube Companion

Living checklist. See also `docs/DECISIONS.md`.

## Phase 1 — Foundation

- [x] electron-vite / React / TypeScript project
- [x] Tailwind + UI primitives
- [x] Secure BrowserWindow + preload IPC
- [x] App shell + i18n (pl/en)
- [x] `tools:setup` + ToolPathResolver
- [x] Settings/history persistence
- [x] Docs: DECISIONS, ARCHITECTURE, DEVELOPMENT

## Phase 2 — Analyze & preview

- [x] YouTube URL allowlist/classifier
- [x] Video metadata via yt-dlp JSON
- [x] Playlist flat preview + virtualization
- [x] Ambiguous video+list choice
- [x] Formats, captions, chapters in preview

## Phase 3 — Downloads

- [x] Download queue service
- [x] Video / audio downloads
- [x] Progress JSON parsing + throttled UI
- [x] Cancel / retry / open file/folder

## Phase 4 — Playlists

- [x] Selection UX
- [x] Indexed filenames in playlist folder
- [x] Per-item failure isolation

## Phase 5 — Transcripts & companions

- [x] Caption export (VTT/SRT/TXT/JSON)
- [x] Thumbnail / description / chapters / metadata

## Phase 6 — Polish

- [x] History + interrupted recovery
- [x] Settings (general/downloads/tools)
- [x] Themes + shortcuts
- [x] Diagnostics log export
- [x] Motion accents

## Phase 7 — QA & ship

- [x] Unit + integration tests (26 passed)
- [x] Live YouTube metadata smoke (`jNQXAC9IVRw` — Me at the zoo)
- [x] `dist:win` NSIS + portable artifacts in `release/`
- [x] README + THIRD_PARTY_NOTICES + FUTURE_AI
