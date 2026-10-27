import { describe, expect, it } from 'vitest'
import {
  createLineSplitter,
  parseProgressLine,
  PROGRESS_DL_PREFIX,
  PROGRESS_PP_PREFIX
} from '../../src/main/infrastructure/ytdlp/progressParser'

describe('progress parser', () => {
  it('parses LYC_DL prefixed JSON (actual yt-dlp template output)', () => {
    const json = JSON.stringify({
      status: 'downloading',
      downloaded_bytes: 100,
      total_bytes: 200,
      speed: 50,
      eta: 2,
      _percent: 50.0,
      filename: 'x.mp4'
    })
    const p = parseProgressLine('job-1', `${PROGRESS_DL_PREFIX}${json}`)
    expect(p).toMatchObject({
      jobId: 'job-1',
      stage: 'download',
      percent: 50,
      downloadedBytes: 100,
      totalBytes: 200,
      speedBytesPerSec: 50,
      etaSeconds: 2
    })
  })

  it('parses raw JSON progress lines (no prefix)', () => {
    const line =
      '{"status":"downloading","downloaded_bytes":3072,"total_bytes":252182,"speed":614415,"_percent":1.2}'
    const p = parseProgressLine('job-1', line)
    expect(p?.downloadedBytes).toBe(3072)
    expect(p?.percent).toBe(1.2)
  })

  it('parses postprocess lines', () => {
    const p = parseProgressLine('job-1', `${PROGRESS_PP_PREFIX}C:\\out\\file.mp3`)
    expect(p?.stage).toBe('postprocess')
    expect(p?.state).toBe('processing')
  })

  it('splits chunked stdout across line boundaries', () => {
    const lines: string[] = []
    const push = createLineSplitter((l) => lines.push(l))
    push('{"status":"downloading","downloaded_bytes":1}\n{"status":"down')
    push('loading","downloaded_bytes":2}\n')
    expect(lines).toHaveLength(2)
    expect(lines[0]).toContain('"downloaded_bytes":1')
    expect(lines[1]).toContain('"downloaded_bytes":2')
  })
})
