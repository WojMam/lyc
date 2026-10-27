# Architecture

## Processes

- **Main:** filesystem, child processes (yt-dlp/FFmpeg/Deno), queue, persistence, IPC handlers
- **Preload:** typed `window.api` via `contextBridge` only
- **Renderer:** React UI, Zustand, i18n — no Node APIs

## Layers

1. **Shared domain** — models, URL validation, format selection, job FSM, Zod IPC schemas
2. **Application services** — `AnalyzeService`, `DownloadQueueService`
3. **Infrastructure** — `YtDlpMediaProvider`, `ProcessRunner`, `ToolPathResolver`, JSON stores, transcript parser
4. **UI features** — analyze, downloads, library, settings

## Data flow (analyze)

```
URL → validateYouTubeUrl → AnalyzeService → YtDlpMediaProvider (--dump-single-json)
    → mapVideoMetadata / mapPlaylistMetadata → IPC → Renderer preview
```

## Data flow (download)

```
Action dialog → enqueue IPC → DownloadQueueService → YtDlpMediaProvider
    → progress events (throttled) → Downloads UI → HistoryStore
```

## External tools

Resolved by `ToolPathResolver`:

1. User overrides in settings
2. Packaged `process.resourcesPath/bin`
3. Dev `vendor/bin`
