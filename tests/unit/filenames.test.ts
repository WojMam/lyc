import { describe, expect, it } from 'vitest'
import {
  buildPlaylistItemFilename,
  buildVideoFilename,
  sanitizeFilename
} from '../../src/shared/domain/filenames'

describe('sanitizeFilename', () => {
  it('removes illegal characters', () => {
    expect(sanitizeFilename('a<b>c:d"e/f\\g|h?i*j')).toBe('abcdefghij')
  })

  it('handles reserved names', () => {
    expect(sanitizeFilename('con')).toBe('_con')
  })

  it('falls back for empty', () => {
    expect(sanitizeFilename('???')).toBe('download')
  })
})

describe('build filenames', () => {
  it('builds video filename', () => {
    expect(buildVideoFilename('Hello World', 'abcdef12345', 'mp4')).toBe(
      'Hello World [abcdef12345].mp4'
    )
  })

  it('builds playlist indexed filename', () => {
    expect(buildPlaylistItemFilename(1, 'Title', 'abcdef12345', 'mkv')).toBe(
      '001 - Title [abcdef12345].mkv'
    )
  })
})
