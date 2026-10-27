# Packaging

## Build

```bash
npm run tools:setup
npm run dist:win
```

Artifacts land in `release/`:

- NSIS installer: `Local YouTube Companion-<version>-setup.exe`
- Portable: `Local YouTube Companion-<version>-portable.exe`

## How tools are bundled

`electron-builder.yml` copies `vendor/bin` → `resources/bin` via `extraResources` (outside ASAR).

At runtime:

```ts
path.join(process.resourcesPath, 'bin', 'yt-dlp.exe')
```

## Code signing

Unsigned builds will trigger Windows SmartScreen warnings. Signing is optional for private use and required for smooth public distribution.

## Licenses

See `THIRD_PARTY_NOTICES.md`. Bundling yt-dlp.exe and FFmpeg GPL has GPLv3+ implications for public redistribution.
