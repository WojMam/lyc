import { describe, expect, it } from 'vitest'
import { buildAudioEmbedArgs } from '../../src/main/infrastructure/ffmpeg/probeAudioTags'

describe('buildAudioEmbedArgs', () => {
  it('includes thumbnail and metadata flags when enabled', () => {
    const args = buildAudioEmbedArgs({
      format: 'mp3',
      embedThumbnail: true,
      embedMetadata: true
    })
    expect(args).toContain('--embed-thumbnail')
    expect(args).toContain('--embed-metadata')
    expect(args).toContain('--convert-thumbnails')
    expect(args).toContain('jpg')
  })

  it('omits thumbnail flags when disabled', () => {
    const args = buildAudioEmbedArgs({
      format: 'mp3',
      embedThumbnail: false,
      embedMetadata: true
    })
    expect(args).not.toContain('--embed-thumbnail')
    expect(args).toContain('--embed-metadata')
  })

  it('omits metadata flags when disabled', () => {
    const args = buildAudioEmbedArgs({
      format: 'm4a',
      embedThumbnail: true,
      embedMetadata: false
    })
    expect(args).toContain('--embed-thumbnail')
    expect(args).not.toContain('--embed-metadata')
  })

  it('adds album parse-metadata when albumTitle is provided', () => {
    const args = buildAudioEmbedArgs({
      format: 'mp3',
      embedThumbnail: false,
      embedMetadata: true,
      albumTitle: 'My Playlist (Vol. 1)'
    })
    const albumArg = args.find((a) => a.includes('meta_album'))
    expect(albumArg).toBeTruthy()
    expect(albumArg).toContain('My Playlist')
  })

  it('overrides title and artist when metadataSource is custom', () => {
    const args = buildAudioEmbedArgs({
      format: 'mp3',
      embedThumbnail: false,
      embedMetadata: true,
      metadataSource: 'custom',
      customTitle: 'My Song (Live)',
      customArtist: 'The Artist'
    })
    const titleArg = args.find((a) => a.includes('meta_title'))
    const artistArg = args.find((a) => a.includes('meta_artist'))
    expect(titleArg).toContain('My Song')
    expect(artistArg).toContain('The Artist')
  })

  it('does not override title/artist for youtube source', () => {
    const args = buildAudioEmbedArgs({
      format: 'mp3',
      embedThumbnail: false,
      embedMetadata: true,
      metadataSource: 'youtube',
      customTitle: 'Ignored',
      customArtist: 'Ignored'
    })
    expect(args.some((a) => a.includes('meta_title'))).toBe(false)
    expect(args.some((a) => a.includes('meta_artist'))).toBe(false)
  })

  it('returns empty when both options disabled', () => {
    const args = buildAudioEmbedArgs({
      format: 'opus',
      embedThumbnail: false,
      embedMetadata: false
    })
    expect(args).toEqual([])
  })
})

describe('audio options schema defaults', () => {
  it('defaults embed flags to true via zod', async () => {
    const { audioDownloadOptionsSchema } = await import('../../src/shared/schemas/ipc')
    const parsed = audioDownloadOptionsSchema.parse({
      format: 'mp3',
      quality: '192k',
      outputDirectory: 'C:\\Downloads'
    })
    expect(parsed.embedThumbnail).toBe(true)
    expect(parsed.embedMetadata).toBe(true)
    expect(parsed.metadataSource).toBe('youtube')
  })

  it('preserves explicit false values', async () => {
    const { audioDownloadOptionsSchema } = await import('../../src/shared/schemas/ipc')
    const parsed = audioDownloadOptionsSchema.parse({
      format: 'mp3',
      quality: '128k',
      outputDirectory: 'C:\\Downloads',
      embedThumbnail: false,
      embedMetadata: false
    })
    expect(parsed.embedThumbnail).toBe(false)
    expect(parsed.embedMetadata).toBe(false)
  })
})
