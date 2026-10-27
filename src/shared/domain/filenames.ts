const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i
// eslint-disable-next-line no-control-regex -- Windows forbids control chars in filenames
const ILLEGAL_CHARS = /[<>:"/\\|?*\u0000-\u001f]/g

export function sanitizeFilename(name: string, maxLength = 180): string {
  let cleaned = name
    .normalize('NFKC')
    .replace(ILLEGAL_CHARS, '')
    .replace(/\s+/g, ' ')
    .replace(/[. ]+$/g, '')
    .trim()

  if (!cleaned) cleaned = 'download'
  if (WINDOWS_RESERVED.test(cleaned)) cleaned = `_${cleaned}`

  if (cleaned.length > maxLength) {
    cleaned = cleaned
      .slice(0, maxLength)
      .replace(/[. ]+$/g, '')
      .trim()
  }

  return cleaned || 'download'
}

export function buildVideoFilename(title: string, videoId: string, ext: string): string {
  const safeTitle = sanitizeFilename(title)
  const safeExt = ext.replace(/^\./, '').toLowerCase()
  return `${safeTitle} [${videoId}].${safeExt}`
}

export function buildPlaylistItemFilename(
  index: number,
  title: string,
  videoId: string,
  ext: string,
  padWidth = 3
): string {
  const padded = String(index).padStart(padWidth, '0')
  const safeTitle = sanitizeFilename(title)
  const safeExt = ext.replace(/^\./, '').toLowerCase()
  return `${padded} - ${safeTitle} [${videoId}].${safeExt}`
}

export function sanitizeDirectoryName(name: string): string {
  return sanitizeFilename(name, 120)
}
