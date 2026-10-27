import type { DownloadProgress, JobState } from '../../../shared/domain/types'

/** Prefix embedded in the template body (TYPES:TEMPLATE — TYPES is not printed). */
export const PROGRESS_DL_PREFIX = 'LYC_DL:'
export const PROGRESS_PP_PREFIX = 'LYC_PP:'

export const DOWNLOAD_PROGRESS_TEMPLATE = `download:${PROGRESS_DL_PREFIX}%(progress)j`
export const POSTPROCESS_PROGRESS_TEMPLATE = `postprocess:${PROGRESS_PP_PREFIX}%(info.filepath)s`

/**
 * Parse a single line of yt-dlp progress output.
 * With `--progress-template download:LYC_DL:%(progress)j`, yt-dlp prints
 * `LYC_DL:{...json...}` (the `download:` part is the template type, not output).
 */
export function parseProgressLine(
  jobId: string,
  line: string,
  fallbackState: JobState = 'downloading'
): DownloadProgress | null {
  const trimmed = line.trim()
  if (!trimmed) return null

  if (trimmed.startsWith(PROGRESS_PP_PREFIX) || trimmed.startsWith('postprocess:')) {
    const message = trimmed.startsWith(PROGRESS_PP_PREFIX)
      ? trimmed.slice(PROGRESS_PP_PREFIX.length).trim()
      : trimmed.slice('postprocess:'.length).trim()
    return {
      jobId,
      state: 'processing',
      stage: 'postprocess',
      message: message || 'Post-processing',
      percent: 100
    }
  }

  let jsonPart: string | null = null
  if (trimmed.startsWith(PROGRESS_DL_PREFIX)) {
    jsonPart = trimmed.slice(PROGRESS_DL_PREFIX.length)
  } else if (trimmed.startsWith('download:')) {
    // Legacy / mistaken prefix — still try
    jsonPart = trimmed.slice('download:'.length)
  } else if (trimmed.startsWith('{') && trimmed.includes('downloaded_bytes')) {
    jsonPart = trimmed
  } else if (trimmed.startsWith('{') && /"status"\s*:\s*"(downloading|finished)"/.test(trimmed)) {
    jsonPart = trimmed
  }

  if (!jsonPart) return null

  try {
    const data = JSON.parse(jsonPart) as Record<string, unknown>
    const status = data.status ? String(data.status) : 'downloading'
    const percent = toNumber(data._percent) ?? parsePercent(data._percent_str)
    return {
      jobId,
      state: status === 'finished' ? 'processing' : fallbackState,
      stage: status === 'finished' ? 'postprocess' : 'download',
      percent,
      downloadedBytes: toNumber(data.downloaded_bytes),
      totalBytes: toNumber(data.total_bytes) ?? toNumber(data.total_bytes_estimate),
      speedBytesPerSec: toNumber(data.speed),
      etaSeconds: toNumber(data.eta),
      filename: data.filename ? String(data.filename) : undefined
    }
  } catch {
    return null
  }
}

/** Buffer incomplete lines across stdout/stderr chunks. */
export function createLineSplitter(onLine: (line: string) => void): (chunk: string) => void {
  let buffer = ''
  return (chunk: string) => {
    buffer += chunk
    // yt-dlp --newline uses \n; also handle \r-only progress updates
    const parts = buffer.split(/\r?\n|\r/)
    buffer = parts.pop() ?? ''
    for (const part of parts) {
      if (part.trim()) onLine(part)
    }
  }
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return undefined
}

function parsePercent(value: unknown): number | undefined {
  if (typeof value !== 'string') return undefined
  const m = value.replace('%', '').trim()
  const n = Number(m)
  return Number.isFinite(n) ? n : undefined
}
