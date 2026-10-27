import type { TranscriptSegment } from '../../../shared/domain/types'

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)))
}

function parseTimestampToMs(ts: string): number {
  // 00:00:01.000 or 00:00:01,000 or 00:01.000
  const cleaned = ts.trim().replace(',', '.')
  const parts = cleaned.split(':')
  let h = 0
  let m = 0
  let s = 0
  if (parts.length === 3) {
    h = Number(parts[0])
    m = Number(parts[1])
    s = Number(parts[2])
  } else if (parts.length === 2) {
    m = Number(parts[0])
    s = Number(parts[1])
  } else {
    s = Number(parts[0])
  }
  return Math.round((h * 3600 + m * 60 + s) * 1000)
}

function stripTags(text: string): string {
  return decodeEntities(text.replace(/<[^>]+>/g, ''))
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Parse WebVTT into ordered segments, collapsing overlapping rolling auto-captions
 * when consecutive cues have identical text.
 */
export function parseVttToSegments(content: string): TranscriptSegment[] {
  const normalized = content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n')
  const blocks = normalized.split(/\n\n+/)
  const segments: TranscriptSegment[] = []

  for (const block of blocks) {
    const lines = block.split('\n').filter((l) => l.trim() !== '')
    if (lines.length === 0) continue
    if (
      lines[0]!.startsWith('WEBVTT') ||
      lines[0]!.startsWith('NOTE') ||
      lines[0]!.startsWith('STYLE')
    ) {
      continue
    }

    const timeLineIdx = lines.findIndex((l) => l.includes('-->'))
    if (timeLineIdx < 0) continue
    const timeLine = lines[timeLineIdx]!
    const match = timeLine.match(/([\d:.]+)\s*-->\s*([\d:.]+)/)
    if (!match) continue
    const startMs = parseTimestampToMs(match[1]!)
    const endMs = parseTimestampToMs(match[2]!)
    const text = stripTags(lines.slice(timeLineIdx + 1).join(' '))
    if (!text) continue

    const prev = segments[segments.length - 1]
    if (prev && prev.text === text && startMs <= prev.endMs) {
      prev.endMs = Math.max(prev.endMs, endMs)
      continue
    }
    segments.push({ startMs, endMs, text })
  }
  return segments
}

export function parseSrtToSegments(content: string): TranscriptSegment[] {
  const normalized = content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n')
  const blocks = normalized.split(/\n\n+/)
  const segments: TranscriptSegment[] = []

  for (const block of blocks) {
    const lines = block.split('\n').filter((l) => l.trim() !== '')
    if (lines.length < 2) continue
    let idx = 0
    if (/^\d+$/.test(lines[0]!.trim())) idx = 1
    const timeLine = lines[idx]
    if (!timeLine || !timeLine.includes('-->')) continue
    const match = timeLine.match(/([\d:,.]+)\s*-->\s*([\d:,.]+)/)
    if (!match) continue
    const startMs = parseTimestampToMs(match[1]!)
    const endMs = parseTimestampToMs(match[2]!)
    const text = stripTags(lines.slice(idx + 1).join(' '))
    if (!text) continue
    segments.push({ startMs, endMs, text })
  }
  return segments
}

export function segmentsToTxt(segments: TranscriptSegment[], withTimestamps: boolean): string {
  if (!withTimestamps) {
    return segments.map((s) => s.text).join('\n')
  }
  return segments.map((s) => `[${formatVttTime(s.startMs)}] ${s.text}`).join('\n')
}

export function segmentsToSrt(segments: TranscriptSegment[]): string {
  return segments
    .map((s, i) => {
      return `${i + 1}\n${formatSrtTime(s.startMs)} --> ${formatSrtTime(s.endMs)}\n${s.text}\n`
    })
    .join('\n')
}

export function segmentsToVtt(segments: TranscriptSegment[]): string {
  const body = segments
    .map((s) => `${formatVttTime(s.startMs)} --> ${formatVttTime(s.endMs)}\n${s.text}`)
    .join('\n\n')
  return `WEBVTT\n\n${body}\n`
}

function formatVttTime(ms: number): string {
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  const s = Math.floor((ms % 60_000) / 1000)
  const millis = ms % 1000
  return `${pad(h)}:${pad(m)}:${pad(s)}.${String(millis).padStart(3, '0')}`
}

function formatSrtTime(ms: number): string {
  return formatVttTime(ms).replace('.', ',')
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}
