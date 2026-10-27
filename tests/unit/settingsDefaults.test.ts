import { describe, expect, it } from 'vitest'
import { settingsPatchSchema } from '../../src/shared/schemas/ipc'

describe('settings backward compatibility', () => {
  it('accepts patches without new audio embed keys', () => {
    const parsed = settingsPatchSchema.parse({
      preferredAudioFormat: 'mp3',
      locale: 'pl'
    })
    expect(parsed.preferredAudioFormat).toBe('mp3')
    expect(parsed.embedAudioThumbnail).toBeUndefined()
  })

  it('accepts new embed preference keys', () => {
    const parsed = settingsPatchSchema.parse({
      embedAudioThumbnail: false,
      embedAudioMetadata: true
    })
    expect(parsed.embedAudioThumbnail).toBe(false)
    expect(parsed.embedAudioMetadata).toBe(true)
  })
})
