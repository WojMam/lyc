import { describe, expect, it } from 'vitest'
import { classifyAnalyzeIntent, validateYouTubeUrl } from '../../src/shared/domain/youtubeUrl'

describe('validateYouTubeUrl', () => {
  it('accepts watch URLs', () => {
    const r = validateYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.source.kind).toBe('video')
      expect(r.source.videoId).toBe('dQw4w9WgXcQ')
      expect(r.source.ambiguous).toBe(false)
    }
  })

  it('accepts youtu.be', () => {
    const r = validateYouTubeUrl('https://youtu.be/dQw4w9WgXcQ')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.source.videoId).toBe('dQw4w9WgXcQ')
  })

  it('accepts shorts', () => {
    const r = validateYouTubeUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.source.videoId).toBe('dQw4w9WgXcQ')
  })

  it('marks video+list as ambiguous', () => {
    const r = validateYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLtest123456')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.source.ambiguous).toBe(true)
      expect(r.source.kind).toBe('video')
      expect(r.source.playlistId).toBe('PLtest123456')
    }
  })

  it('accepts playlist URLs', () => {
    const r = validateYouTubeUrl('https://www.youtube.com/playlist?list=PLtest123456')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.source.kind).toBe('playlist')
      expect(r.source.playlistId).toBe('PLtest123456')
    }
  })

  it('rejects non-YouTube hosts', () => {
    const r = validateYouTubeUrl('https://example.com/watch?v=dQw4w9WgXcQ')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('unsupported_host')
  })

  it('rejects credentials', () => {
    const r = validateYouTubeUrl('https://user:pass@www.youtube.com/watch?v=dQw4w9WgXcQ')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('credentials')
  })

  it('rejects empty', () => {
    const r = validateYouTubeUrl('   ')
    expect(r.ok).toBe(false)
  })
})

describe('classifyAnalyzeIntent', () => {
  it('respects explicit playlist intent', () => {
    const r = validateYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLtest123456')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(classifyAnalyzeIntent(r.source, 'playlist')).toBe('playlist')
      expect(classifyAnalyzeIntent(r.source, 'video')).toBe('video')
    }
  })
})
