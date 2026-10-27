import type { JobState } from './types'

const ALLOWED: Record<JobState, readonly JobState[]> = {
  queued: ['analyzing', 'downloading', 'canceled'],
  analyzing: ['downloading', 'processing', 'failed', 'canceled', 'interrupted'],
  downloading: ['processing', 'completed', 'failed', 'canceled', 'interrupted'],
  processing: ['completed', 'failed', 'canceled', 'interrupted'],
  completed: [],
  failed: ['queued'],
  canceled: ['queued'],
  interrupted: ['queued']
}

export function canTransition(from: JobState, to: JobState): boolean {
  return ALLOWED[from].includes(to)
}

export function assertTransition(from: JobState, to: JobState): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid job state transition: ${from} -> ${to}`)
  }
}

export function isTerminalState(state: JobState): boolean {
  return state === 'completed' || state === 'failed' || state === 'canceled'
}

export function isActiveState(state: JobState): boolean {
  return (
    state === 'queued' || state === 'analyzing' || state === 'downloading' || state === 'processing'
  )
}
