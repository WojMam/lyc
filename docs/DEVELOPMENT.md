# Development

## Prerequisites

- Windows 11 x64
- Node.js ≥ 20.19 (22+ recommended)
- npm 10+

## Setup

```bash
npm install
npm run tools:setup
npm run dev
```

`tools:setup` downloads yt-dlp, Deno, and FFmpeg into `vendor/bin/` (gitignored) and verifies checksums when available.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Electron + Vite HMR |
| `npm run typecheck` | TypeScript |
| `npm run lint` | ESLint |
| `npm run test` | Vitest unit/integration |
| `npm run build` | Production compile |
| `npm run dist:win` | NSIS + portable packages |

## Security notes

- Renderer is sandboxed; never enable `nodeIntegration`
- All IPC payloads validated with Zod
- Child processes spawned with `shell: false` and absolute tool paths
