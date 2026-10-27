import type { QualityMode, ResolutionOption, VideoFormatOption } from './types'

export function mapYtDlpFormats(rawFormats: unknown[]): VideoFormatOption[] {
  const result: VideoFormatOption[] = []
  for (const raw of rawFormats) {
    if (!raw || typeof raw !== 'object') continue
    const f = raw as Record<string, unknown>
    const formatId = String(f.format_id ?? '')
    if (!formatId) continue
    const vcodec = f.vcodec ? String(f.vcodec) : undefined
    const acodec = f.acodec ? String(f.acodec) : undefined
    const isVideoOnly = !!vcodec && vcodec !== 'none' && (!acodec || acodec === 'none')
    const isAudioOnly = !!acodec && acodec !== 'none' && (!vcodec || vcodec === 'none')
    result.push({
      formatId,
      height: typeof f.height === 'number' ? f.height : undefined,
      width: typeof f.width === 'number' ? f.width : undefined,
      fps: typeof f.fps === 'number' ? f.fps : undefined,
      vcodec,
      acodec,
      ext: String(f.ext ?? 'unknown'),
      filesize:
        typeof f.filesize === 'number'
          ? f.filesize
          : typeof f.filesize_approx === 'number'
            ? f.filesize_approx
            : undefined,
      tbr: typeof f.tbr === 'number' ? f.tbr : undefined,
      note: f.format_note ? String(f.format_note) : undefined,
      isVideoOnly,
      isAudioOnly
    })
  }
  return result
}

export function buildResolutionOptions(formats: VideoFormatOption[]): ResolutionOption[] {
  const byHeight = new Map<number, Set<string>>()
  for (const f of formats) {
    if (!f.height || f.height <= 0) continue
    if (!f.vcodec || f.vcodec === 'none') continue
    const set = byHeight.get(f.height) ?? new Set<string>()
    set.add(f.formatId)
    byHeight.set(f.height, set)
  }

  return [...byHeight.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([height, ids]) => ({
      height,
      label: height >= 2160 ? `${height}p / 4K` : `${height}p`,
      formatIds: [...ids]
    }))
}

export function selectFormatSelector(
  mode: QualityMode,
  height: number | undefined,
  container: 'mp4' | 'mkv' | 'auto'
): string {
  const preferMp4 = container === 'mp4' || container === 'auto'
  const vPref = preferMp4 ? '[ext=mp4]/best' : 'best'
  const aPref = preferMp4 ? '[ext=m4a]/best' : 'best'

  if (mode === 'best' || height === undefined) {
    return `bv*+ba/b`
  }

  if (mode === 'exact') {
    return `bv*[height=${height}]+ba/${vPref}[height=${height}]+${aPref}/b[height=${height}]`
  }

  // best_up_to
  return `bv*[height<=${height}]+ba/${vPref}[height<=${height}]+${aPref}/b[height<=${height}]/bv*+ba/b`
}

export function audioQualityToYtDlp(quality: 'vbr_high' | '192k' | '128k'): string {
  if (quality === 'vbr_high') return '0'
  if (quality === '192k') return '192K'
  return '128K'
}
