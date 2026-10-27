# Testing

## Automated

```bash
npm run test
npm run typecheck
npm run lint
```

Unit/integration tests use fixtures and `MockProcessRunner`. They do **not** require live YouTube access.

## Manual smoke (authorized content only)

1. Launch `npm run dev`
2. Analyze a video URL — confirm preview, resolutions, no auto-download
3. Download 360p/720p video — confirm playable file
4. Extract MP3 — confirm audio file
5. Export transcript when captions exist
6. Analyze playlist — select subset — download into folder with indexed names
7. Restart app — settings/history persist
8. Packaged app launches without Node/Python installed

If live tests cannot run, document exactly what was skipped.
