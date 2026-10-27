# Architecture Decision Log

## ADR-001: Electron + electron-vite + React + TypeScript

**Decision:** Use electron-vite 3.x with React 19, TypeScript strict, Tailwind 3.4 (stable with shadcn patterns), and a secure preload bridge.

**Rationale:** Matches the product stack requirement, strong Windows packaging story via electron-builder, and clear main/preload/renderer separation.

## ADR-002: yt-dlp as the only YouTube extractor

**Decision:** Never reimplement YouTube extraction. Shell out to official `yt-dlp.exe` with argument arrays (`shell: false`).

**Rationale:** YouTube challenge solving changes frequently; yt-dlp + EJS is the maintained path.

## ADR-003: Bundle Deno beside yt-dlp

**Decision:** Package Deno ≥2.3 and always pass `--js-runtimes deno:<absolute-path>`.

**Rationale:** Official yt-dlp.exe bundles EJS scripts but not a JS runtime. Electron/Node in-process is not used as the yt-dlp JS runtime.

## ADR-004: FFmpeg GPL (BtbN win64-gpl)

**Decision:** Ship BtbN GPL FFmpeg/FFprobe builds.

**Rationale:** MP3 export requires libmp3lame, typically unavailable in LGPL-only builds. Document GPLv3 redistribution obligations.

## ADR-005: No Pause control

**Decision:** Expose Cancel + Retry only. Rely on yt-dlp partial resume where available.

**Rationale:** Reliable pause/resume across merge/postprocess stages is not guaranteed.

## ADR-006: JsonFileStore instead of electron-store

**Decision:** Persist settings/history with a small atomic JSON file store under `app.getPath('userData')`.

**Rationale:** Avoids ESM-only electron-store friction in the Electron main process while meeting persistence requirements.

## ADR-007: App license MIT + third-party notices

**Decision:** Application source is MIT. Bundled yt-dlp.exe and FFmpeg-GPL remain under their upstream terms (GPLv3+ combined works). Public redistribution must satisfy those obligations.

## ADR-008: Polish-first typed i18n catalogs

**Decision:** Use typed `pl`/`en` message objects instead of a heavy i18n framework.

**Rationale:** Only two locales; keeps dependencies minimal and keys typed.
