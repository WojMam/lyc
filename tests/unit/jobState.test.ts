import { describe, expect, it } from 'vitest'
import { canTransition, isActiveState, isTerminalState } from '../../src/shared/domain/jobState'

describe('job state machine', () => {
  it('allows valid transitions', () => {
    expect(canTransition('queued', 'downloading')).toBe(true)
    expect(canTransition('downloading', 'processing')).toBe(true)
    expect(canTransition('processing', 'completed')).toBe(true)
    expect(canTransition('failed', 'queued')).toBe(true)
  })

  it('rejects invalid transitions', () => {
    expect(canTransition('completed', 'downloading')).toBe(false)
    expect(canTransition('queued', 'completed')).toBe(false)
  })

  it('classifies states', () => {
    expect(isTerminalState('completed')).toBe(true)
    expect(isActiveState('downloading')).toBe(true)
  })
})
