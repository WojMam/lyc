import type { MediaKind, MediaSource } from './types'

const ALLOWED_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be'
])

export type UrlValidationResult =
  | { ok: true; source: MediaSource }
  | {
      ok: false
      reason: 'empty' | 'invalid' | 'unsupported_scheme' | 'unsupported_host' | 'credentials'
    }

function stripWww(host: string): string {
  return host.toLowerCase()
}

export function validateYouTubeUrl(raw: string): UrlValidationResult {
  const trimmed = raw.trim()
  if (!trimmed) return { ok: false, reason: 'empty' }

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return { ok: false, reason: 'invalid' }
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return { ok: false, reason: 'unsupported_scheme' }
  }

  // Prefer https; reject embedded credentials
  if (url.username || url.password) {
    return { ok: false, reason: 'credentials' }
  }

  const host = stripWww(url.hostname)
  if (!ALLOWED_HOSTS.has(host)) {
    return { ok: false, reason: 'unsupported_host' }
  }

  // Normalize to https for downstream use
  url.protocol = 'https:'

  const videoId = extractVideoId(url, host)
  const playlistId = extractPlaylistId(url)
  const isPlaylistPath = url.pathname === '/playlist' || url.pathname.startsWith('/playlist/')

  let kind: MediaKind
  let ambiguous = false

  if (isPlaylistPath && playlistId) {
    kind = 'playlist'
  } else if (videoId && playlistId) {
    kind = 'video'
    ambiguous = true
  } else if (playlistId && !videoId) {
    kind = 'playlist'
  } else if (videoId) {
    kind = 'video'
  } else {
    return { ok: false, reason: 'invalid' }
  }

  return {
    ok: true,
    source: {
      url: url.toString(),
      kind,
      videoId: videoId ?? undefined,
      playlistId: playlistId ?? undefined,
      ambiguous
    }
  }
}

function extractVideoId(url: URL, host: string): string | null {
  if (host === 'youtu.be') {
    const id = url.pathname.replace(/^\//, '').split('/')[0]
    return isValidVideoId(id) ? id! : null
  }

  const v = url.searchParams.get('v')
  if (v && isValidVideoId(v)) return v

  const shorts = url.pathname.match(/^\/shorts\/([A-Za-z0-9_-]{11})/)
  if (shorts?.[1]) return shorts[1]

  const live = url.pathname.match(/^\/live\/([A-Za-z0-9_-]{11})/)
  if (live?.[1]) return live[1]

  const embed = url.pathname.match(/^\/embed\/([A-Za-z0-9_-]{11})/)
  if (embed?.[1]) return embed[1]

  return null
}

function extractPlaylistId(url: URL): string | null {
  const list = url.searchParams.get('list')
  if (!list) return null
  if (/^[A-Za-z0-9_-]+$/.test(list) && list.length >= 2) return list
  return null
}

function isValidVideoId(id: string | undefined | null): boolean {
  return !!id && /^[A-Za-z0-9_-]{11}$/.test(id)
}

export function classifyAnalyzeIntent(
  source: MediaSource,
  intent: 'auto' | 'video' | 'playlist'
): 'video' | 'playlist' {
  if (intent === 'video') return 'video'
  if (intent === 'playlist') return 'playlist'
  return source.kind
}
