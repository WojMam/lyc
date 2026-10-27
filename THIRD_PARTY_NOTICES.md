# Third-party notices

This application bundles or depends on third-party components. Their licenses remain in force.

## yt-dlp (official Windows executable)

- Source: https://github.com/yt-dlp/yt-dlp
- The PyInstaller-bundled `yt-dlp.exe` is a **combined work under GPLv3+** (see upstream README).
- Includes bundled yt-dlp-ejs challenge scripts.
- Redistribution of the packaged application publicly requires GPLv3+ compliance for this component (notices, and source offer for GPL-covered parts as applicable).

## FFmpeg / FFprobe (BtbN win64-gpl builds)

- https://github.com/BtbN/FFmpeg-Builds
- GPL builds include GPL-licensed encoders (e.g. libx264) and MP3 encoding support (libmp3lame).
- Redistribution must satisfy FFmpeg and dependency license terms.

## Deno

- https://github.com/denoland/deno
- Primarily MIT, with additional third-party notices inside the binary distribution.
- Used solely as yt-dlp's external JavaScript runtime (`--js-runtimes`).

## Electron and npm dependencies

- Electron (MIT) plus Chromium third-party licenses (`LICENSES.chromium.html` in Electron distributions).
- Other npm packages: see each package's license field under `node_modules/`.

## Private vs public distribution

Private personal use of this project is the primary intent. If you redistribute binaries publicly, review and satisfy the GPLv3+ obligations of bundled yt-dlp.exe and FFmpeg-GPL. This document is not legal advice.
