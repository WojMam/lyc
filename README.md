# Local YouTube Companion

Local-first Windows 11 desktop app for inspecting and saving YouTube content you are authorized to download.

**Paste URL → Analyze → Preview → Choose action → Download.**

Analysis never starts a download automatically.

## Features

- Video and playlist inspection (yt-dlp JSON metadata)
- Resolution-aware video downloads (exact / best-up-to / best)
- Audio extraction (MP3 / M4A / Opus)
- Caption/transcript export (VTT, SRT, TXT, JSON)
- Thumbnail, description, chapters, metadata exports
- Background download queue with progress, cancel, retry
- Persistent history and settings
- Polish UI by default (English available)
- Bundled yt-dlp, Deno, and FFmpeg — no end-user Python/npm install

## Quick start (development)

```bash
npm install
npm run tools:setup
npm run dev
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Run the app |
| `npm run typecheck` | TypeScript checks |
| `npm run lint` | ESLint |
| `npm run test` | Unit + integration tests |
| `npm run build` | Production build |
| `npm run dist:win` | Windows NSIS + portable packages |

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/DECISIONS.md](docs/DECISIONS.md).

## Packaging

```bash
npm run tools:setup
npm run dist:win
```

Artifacts: `release/`. Details in [docs/PACKAGING.md](docs/PACKAGING.md).

## License

Application source: MIT — see [LICENSE](LICENSE).

Bundled third-party tools have their own licenses — see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Public redistribution of the packaged app must comply with GPLv3+ obligations of bundled yt-dlp.exe and FFmpeg GPL builds.

## Intended use

Only use this software with material you are authorized to save. The app does not bypass DRM, paywalls, or authentication.
