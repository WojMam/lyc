import { app } from 'electron'
import type { StoredDownloadJob } from '../../../shared/domain/jobs'
import { JsonFileStore } from './JsonFileStore'

export type { StoredDownloadJob }

const MAX_JOBS = 500

export class HistoryStore {
  private store: JsonFileStore<{ jobs: StoredDownloadJob[] }>

  constructor() {
    this.store = new JsonFileStore(app.getPath('userData'), 'download-history', { jobs: [] })
  }

  list(): StoredDownloadJob[] {
    return [...this.store.get().jobs].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }

  get(id: string): StoredDownloadJob | undefined {
    return this.store.get().jobs.find((j) => j.id === id)
  }

  upsert(job: StoredDownloadJob): void {
    const jobs = this.store.get().jobs.filter((j) => j.id !== job.id)
    jobs.unshift(job)
    this.store.set({ jobs: jobs.slice(0, MAX_JOBS) })
  }

  remove(id: string): void {
    this.store.set({
      jobs: this.store.get().jobs.filter((j) => j.id !== id)
    })
  }

  clearCompleted(): void {
    this.store.set({
      jobs: this.store.get().jobs.filter((j) => j.state !== 'completed' && j.state !== 'canceled')
    })
  }

  markActiveAsInterrupted(): void {
    const jobs = this.store.get().jobs.map((j) => {
      if (
        j.state === 'queued' ||
        j.state === 'analyzing' ||
        j.state === 'downloading' ||
        j.state === 'processing'
      ) {
        return { ...j, state: 'interrupted' as const, updatedAt: new Date().toISOString() }
      }
      return j
    })
    this.store.set({ jobs })
  }
}
