import { describe, expect, it } from 'vitest'
import { MockProcessRunner } from '../../src/main/infrastructure/processes/ProcessRunner'
import { mapVideoMetadata } from '../../src/main/infrastructure/ytdlp/metadataMapper'

describe('metadata mapping integration (fixture)', () => {
  it('maps fixture-like yt-dlp JSON', () => {
    const raw = {
      id: 'dQw4w9WgXcQ',
      title: 'Sample',
      channel: 'Channel',
      duration: 212,
      formats: [
        { format_id: '137', height: 1080, vcodec: 'avc1', acodec: 'none', ext: 'mp4' },
        { format_id: '140', vcodec: 'none', acodec: 'mp4a', ext: 'm4a' }
      ],
      subtitles: { en: [{ ext: 'vtt' }] },
      automatic_captions: { pl: [{ ext: 'vtt' }] },
      chapters: [{ title: 'Intro', start_time: 0, end_time: 10 }]
    }
    const meta = mapVideoMetadata(raw, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    expect(meta.resolutions[0]?.height).toBe(1080)
    expect(meta.subtitles).toHaveLength(2)
    expect(meta.chapters[0]?.title).toBe('Intro')
  })

  it('mock process runner returns canned stdout', async () => {
    const runner = new MockProcessRunner()
    runner.onRun(async () => ({
      exitCode: 0,
      signal: null,
      stdout: '{"id":"abc"}',
      stderr: '',
      canceled: false,
      timedOut: false
    }))
    const result = await runner.run('yt-dlp.exe', ['--version'])
    expect(JSON.parse(result.stdout).id).toBe('abc')
  })
})
