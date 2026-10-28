import type { IProcessRunner } from '../processes/ProcessRunner'

export interface AudioTagProbe {
  hasAttachedPicture: boolean
  title?: string
  artist?: string
  album?: string
  comment?: string
  rawTags: Record<string, string>
}

/**
 * Inspect an audio file for embedded cover art and common tags via ffprobe.
 */
export async function probeAudioTags(
  runner: IProcessRunner,
  ffprobePath: string,
  filePath: string,
  signal?: AbortSignal
): Promise<AudioTagProbe> {
  const result = await runner.run(
    ffprobePath,
    ['-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', filePath],
    { signal, timeoutMs: 30_000 }
  )

  if (result.exitCode !== 0) {
    return { hasAttachedPicture: false, rawTags: {} }
  }

  let parsed: {
    streams?: Array<{
      codec_type?: string
      disposition?: { attached_pic?: number }
    }>
    format?: { tags?: Record<string, string> }
  }
  try {
    parsed = JSON.parse(result.stdout) as typeof parsed
  } catch {
    return { hasAttachedPicture: false, rawTags: {} }
  }

  const hasAttachedPicture = (parsed.streams ?? []).some(
    (s) =>
      s.disposition?.attached_pic === 1 ||
      (s.codec_type === 'video' && s.disposition?.attached_pic !== 0)
  )

  // Some probes mark cover as video without disposition; treat lone video stream as cover for audio files
  const videoStreams = (parsed.streams ?? []).filter((s) => s.codec_type === 'video')
  const audioStreams = (parsed.streams ?? []).filter((s) => s.codec_type === 'audio')
  const hasCover = hasAttachedPicture || (audioStreams.length >= 1 && videoStreams.length >= 1)

  const tags = normalizeTags(parsed.format?.tags ?? {})

  return {
    hasAttachedPicture: hasCover,
    title: tags.title ?? tags.TITLE,
    artist: tags.artist ?? tags.ARTIST ?? tags.album_artist ?? tags.ALBUM_ARTIST,
    album: tags.album ?? tags.ALBUM,
    comment: tags.comment ?? tags.COMMENT ?? tags.description ?? tags.DESCRIPTION,
    rawTags: tags
  }
}

function normalizeTags(tags: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(tags)) {
    out[k] = v
    out[k.toLowerCase()] = v
  }
  return out
}

/**
 * Build yt-dlp args for audio thumbnail/metadata embedding.
 * Opus/M4A/MP3 all use --embed-thumbnail; JPG conversion helps ID3 (MP3) compatibility.
 */
export function buildAudioEmbedArgs(options: {
  format: 'mp3' | 'm4a' | 'opus'
  embedThumbnail: boolean
  embedMetadata: boolean
  metadataSource?: 'youtube' | 'custom'
  customTitle?: string
  customArtist?: string
  albumTitle?: string
}): string[] {
  const args: string[] = []

  if (options.embedMetadata) {
    // Writes title, artist/uploader, and purl (source URL) among other available tags
    args.push('--embed-metadata')
    if (options.metadataSource === 'custom') {
      const title = options.customTitle?.trim()
      const artist = options.customArtist?.trim()
      if (title) {
        args.push('--parse-metadata', `:(?P<meta_title>${escapeRegex(title)})`)
      }
      if (artist) {
        args.push('--parse-metadata', `:(?P<meta_artist>${escapeRegex(artist)})`)
      }
    }
    if (options.albumTitle?.trim()) {
      // Escape regex metacharacters for a literal album assignment from playlist title
      const album = escapeRegex(options.albumTitle.trim())
      args.push('--parse-metadata', `:(?P<meta_album>${album})`)
    }
  }

  if (options.embedThumbnail) {
    args.push('--embed-thumbnail')
    // JPG is required for reliable ID3 APIC in MP3; also fine for M4A/Opus
    args.push('--convert-thumbnails', 'jpg')
  }

  return args
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
