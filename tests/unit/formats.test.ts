import { describe, expect, it } from 'vitest'
import {
  buildResolutionOptions,
  mapYtDlpFormats,
  selectFormatSelector
} from '../../src/shared/domain/formats'

describe('format mapping', () => {
  it('maps and builds resolutions from formats', () => {
    const formats = mapYtDlpFormats([
      { format_id: '137', height: 1080, vcodec: 'avc1', acodec: 'none', ext: 'mp4' },
      { format_id: '136', height: 720, vcodec: 'avc1', acodec: 'none', ext: 'mp4' },
      { format_id: '140', height: null, vcodec: 'none', acodec: 'mp4a', ext: 'm4a' }
    ])
    expect(formats).toHaveLength(3)
    const resolutions = buildResolutionOptions(formats)
    expect(resolutions.map((r) => r.height)).toEqual([1080, 720])
  })

  it('builds selectors for quality modes', () => {
    expect(selectFormatSelector('best', undefined, 'auto')).toContain('bv*')
    expect(selectFormatSelector('exact', 1080, 'mp4')).toContain('height=1080')
    expect(selectFormatSelector('best_up_to', 720, 'mkv')).toContain('height<=720')
  })
})
