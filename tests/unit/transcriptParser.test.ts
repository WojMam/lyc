import { describe, expect, it } from 'vitest'
import {
  parseSrtToSegments,
  parseVttToSegments,
  segmentsToTxt
} from '../../src/main/infrastructure/transcript/transcriptParser'

describe('transcript parser', () => {
  it('parses VTT and collapses duplicate rolling captions', () => {
    const vtt = `WEBVTT

00:00:00.000 --> 00:00:01.000
Hello

00:00:00.500 --> 00:00:02.000
Hello

00:00:02.000 --> 00:00:03.000
World
`
    const segments = parseVttToSegments(vtt)
    expect(segments).toHaveLength(2)
    expect(segments[0]?.text).toBe('Hello')
    expect(segments[0]?.endMs).toBe(2000)
    expect(segments[1]?.text).toBe('World')
  })

  it('parses SRT with entities', () => {
    const srt = `1
00:00:01,000 --> 00:00:02,000
A &amp; B

`
    const segments = parseSrtToSegments(srt)
    expect(segments[0]?.text).toBe('A & B')
  })

  it('exports plain txt', () => {
    const txt = segmentsToTxt(
      [
        { startMs: 0, endMs: 1000, text: 'One' },
        { startMs: 1000, endMs: 2000, text: 'Two' }
      ],
      false
    )
    expect(txt).toBe('One\nTwo')
  })
})
