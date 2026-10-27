# Future local AI integration

v1 ships **interfaces only** (see `src/shared/ai/interfaces.ts`):

- `AIProvider`
- `SummarizationService`
- `TranscriptRepository`
- `SummaryRequest` / `SummaryResult`
- `ChatRequest` / `ChatResult`

## Planned provider: Ollama

```
POST http://127.0.0.1:11434/api/chat
```

Integration sketch:

1. Persist normalized `Transcript` (segments with `startMs`/`endMs`) when captions are exported or analyzed.
2. Implement `OllamaAIProvider` against the local HTTP API (no cloud).
3. Chunk long transcripts for context limits; optionally map-reduce summaries.
4. Stream tokens to the UI; support cancellation via `AbortSignal`.
5. Cache summaries keyed by `videoId + style + model`.

## Non-goals for the AI phase starter

- Do not call Ollama from v1
- Do not show non-functional AI buttons in v1
- Speech-to-text (Whisper) can implement `ITranscriptProvider` later without changing export formats
