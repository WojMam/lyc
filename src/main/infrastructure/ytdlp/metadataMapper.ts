import type {
  Chapter,
  PlaylistEntry,
  PlaylistMetadata,
  SubtitleTrack,
  VideoMetadata
} from '../../../shared/domain/types'
import { buildResolutionOptions, mapYtDlpFormats } from '../../../shared/domain/formats'

export function mapVideoMetadata(raw: Record<string, unknown>, sourceUrl: string): VideoMetadata {
  const formats = mapYtDlpFormats(Array.isArray(raw.formats) ? raw.formats : [])
  const resolutions = buildResolutionOptions(formats)
  const audioFormats = formats.filter((f) => f.isAudioOnly)

  return {
    kind: 'video',
    id: String(raw.id ?? ''),
    url: sourceUrl,
    title: String(raw.title ?? 'Untitled'),
    channel: raw.channel ? String(raw.channel) : raw.uploader ? String(raw.uploader) : undefined,
    channelId: raw.channel_id ? String(raw.channel_id) : undefined,
    durationSec: typeof raw.duration === 'number' ? raw.duration : undefined,
    uploadDate: raw.upload_date ? String(raw.upload_date) : undefined,
    viewCount: typeof raw.view_count === 'number' ? raw.view_count : undefined,
    description: raw.description ? String(raw.description) : undefined,
    thumbnailUrl: pickThumbnail(raw),
    resolutions,
    audioFormats,
    allFormats: formats,
    subtitles: mapSubtitles(raw),
    chapters: mapChapters(raw),
    playlistId: raw.playlist_id ? String(raw.playlist_id) : undefined,
    playlistTitle: raw.playlist_title ? String(raw.playlist_title) : undefined
  }
}

export function mapPlaylistMetadata(
  raw: Record<string, unknown>,
  sourceUrl: string
): PlaylistMetadata {
  const entriesRaw = Array.isArray(raw.entries) ? raw.entries : []
  const entries: PlaylistEntry[] = []
  let index = 0
  for (const entry of entriesRaw) {
    if (!entry || typeof entry !== 'object') continue
    const e = entry as Record<string, unknown>
    index += 1
    const id = e.id ? String(e.id) : e.url ? String(e.url) : `entry-${index}`
    const unavailable =
      e.ie_key === null ||
      e.title === '[Deleted video]' ||
      e.title === '[Private video]' ||
      e.availability === 'private' ||
      e.availability === 'needs_auth'
    entries.push({
      id,
      title: String(e.title ?? (unavailable ? 'Unavailable' : 'Untitled')),
      url: e.url
        ? String(e.url).startsWith('http')
          ? String(e.url)
          : `https://www.youtube.com/watch?v=${id}`
        : `https://www.youtube.com/watch?v=${id}`,
      durationSec: typeof e.duration === 'number' ? e.duration : undefined,
      thumbnailUrl: pickThumbnail(e),
      channel: e.channel ? String(e.channel) : e.uploader ? String(e.uploader) : undefined,
      index,
      unavailable: Boolean(unavailable)
    })
  }

  return {
    kind: 'playlist',
    id: String(raw.id ?? raw.playlist_id ?? ''),
    url: sourceUrl,
    title: String(raw.title ?? raw.playlist_title ?? 'Playlist'),
    channel: raw.channel ? String(raw.channel) : raw.uploader ? String(raw.uploader) : undefined,
    thumbnailUrl: pickThumbnail(raw),
    entryCount: entries.length,
    entries
  }
}

function pickThumbnail(raw: Record<string, unknown>): string | undefined {
  if (raw.thumbnail) return String(raw.thumbnail)
  if (Array.isArray(raw.thumbnails) && raw.thumbnails.length > 0) {
    const last = raw.thumbnails[raw.thumbnails.length - 1] as Record<string, unknown>
    if (last?.url) return String(last.url)
  }
  return undefined
}

function mapSubtitles(raw: Record<string, unknown>): SubtitleTrack[] {
  const tracks: SubtitleTrack[] = []
  const add = (bag: unknown, origin: 'manual' | 'automatic'): void => {
    if (!bag || typeof bag !== 'object') return
    for (const [lang, list] of Object.entries(bag as Record<string, unknown>)) {
      const ext =
        Array.isArray(list) && list[0] && typeof list[0] === 'object'
          ? String((list[0] as Record<string, unknown>).ext ?? '')
          : undefined
      tracks.push({
        language: lang,
        languageName: lang,
        origin,
        ext: ext || undefined
      })
    }
  }
  add(raw.subtitles, 'manual')
  add(raw.automatic_captions, 'automatic')
  return tracks
}

function mapChapters(raw: Record<string, unknown>): Chapter[] {
  if (!Array.isArray(raw.chapters)) return []
  return raw.chapters
    .filter((c): c is Record<string, unknown> => !!c && typeof c === 'object')
    .map((c) => ({
      title: String(c.title ?? 'Chapter'),
      startMs: Math.round((typeof c.start_time === 'number' ? c.start_time : 0) * 1000),
      endMs: typeof c.end_time === 'number' ? Math.round(c.end_time * 1000) : undefined
    }))
}
