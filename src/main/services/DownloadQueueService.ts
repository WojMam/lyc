import { randomUUID } from 'crypto'
import { shell } from 'electron'
import type { DownloadProgress, DownloadAction } from '../../shared/domain/types'
import { assertTransition, isActiveState } from '../../shared/domain/jobState'
import { AppError } from '../../shared/errors/AppError'
import { ErrorCode } from '../../shared/errors/codes'
import type { EnqueueDownloadRequest } from '../../shared/schemas/ipc'
import type { HistoryStore } from '../infrastructure/persistence/HistoryStore'
import type { StoredDownloadJob } from '../../shared/domain/jobs'
import type { SettingsStore } from '../infrastructure/persistence/SettingsStore'
import type { Logger } from '../infrastructure/persistence/Logger'
import type { IMediaProvider } from '../infrastructure/ytdlp/IMediaProvider'
import { createThrottledEmitter } from '../infrastructure/processes/throttle'

export type JobUpdateListener = (jobs: StoredDownloadJob[]) => void
export type ProgressListener = (progress: DownloadProgress) => void

interface ActiveHandle {
  controller: AbortController
}

export class DownloadQueueService {
  private readonly active = new Map<string, ActiveHandle>()
  private running = 0
  private readonly updateListeners = new Set<JobUpdateListener>()
  private readonly progressListeners = new Set<ProgressListener>()
  private readonly emitProgressThrottled = createThrottledEmitter<DownloadProgress>(250, (p) => {
    for (const l of this.progressListeners) l(p)
  })

  constructor(
    private readonly media: IMediaProvider,
    private readonly history: HistoryStore,
    private readonly settings: SettingsStore,
    private readonly logger: Logger
  ) {}

  onUpdated(listener: JobUpdateListener): () => void {
    this.updateListeners.add(listener)
    return () => this.updateListeners.delete(listener)
  }

  onProgress(listener: ProgressListener): () => void {
    this.progressListeners.add(listener)
    return () => this.progressListeners.delete(listener)
  }

  list(): StoredDownloadJob[] {
    return this.history.list()
  }

  private notify(): void {
    const jobs = this.list()
    for (const l of this.updateListeners) l(jobs)
  }

  enqueue(request: EnqueueDownloadRequest): StoredDownloadJob {
    const id = randomUUID()
    const now = new Date().toISOString()
    const job: StoredDownloadJob = {
      id,
      action: request.action as DownloadAction,
      title: request.title,
      url: request.url,
      videoId: 'videoId' in request ? request.videoId : undefined,
      playlistId: 'playlistId' in request ? request.playlistId : undefined,
      state: 'queued',
      createdAt: now,
      updatedAt: now,
      outputPaths: [],
      outputDirectory:
        'options' in request
          ? request.options.outputDirectory
          : this.settings.get().downloadDirectory,
      requestJson: JSON.stringify(request)
    }
    this.history.upsert(job)
    this.notify()
    void this.pump()
    return job
  }

  async cancel(jobId: string): Promise<void> {
    const job = this.history.get(jobId)
    if (!job) return
    const handle = this.active.get(jobId)
    if (handle) {
      handle.controller.abort()
    }
    if (isActiveState(job.state) || job.state === 'queued') {
      this.updateState(jobId, 'canceled')
    }
  }

  async retry(jobId: string): Promise<void> {
    const job = this.history.get(jobId)
    if (!job) return
    if (job.state !== 'failed' && job.state !== 'canceled' && job.state !== 'interrupted') return
    this.updateState(jobId, 'queued')
    void this.pump()
  }

  remove(jobId: string): void {
    const handle = this.active.get(jobId)
    if (handle) handle.controller.abort()
    this.history.remove(jobId)
    this.notify()
  }

  async openFile(filePath: string): Promise<void> {
    const err = await shell.openPath(filePath)
    if (err)
      throw new AppError(ErrorCode.INVALID_OUTPUT, 'Could not open file', { technicalDetail: err })
  }

  async openFolder(folderPath: string): Promise<void> {
    const err = await shell.openPath(folderPath)
    if (err)
      throw new AppError(ErrorCode.DIRECTORY_NOT_WRITABLE, 'Could not open folder', {
        technicalDetail: err
      })
  }

  private updateState(
    jobId: string,
    state: StoredDownloadJob['state'],
    patch?: Partial<StoredDownloadJob>
  ): void {
    const job = this.history.get(jobId)
    if (!job) return
    if (job.state !== state) {
      try {
        assertTransition(job.state, state)
      } catch {
        // Allow interrupted recovery transitions already validated by callers
        if (!(job.state === 'interrupted' && state === 'queued')) {
          if (!(job.state === 'failed' && state === 'queued')) {
            if (!(job.state === 'canceled' && state === 'queued')) {
              this.logger.warn('Skipping invalid transition', { from: job.state, to: state, jobId })
            }
          }
        }
      }
    }
    this.history.upsert({
      ...job,
      ...patch,
      state,
      updatedAt: new Date().toISOString()
    })
    this.notify()
  }

  private async pump(): Promise<void> {
    const max = this.settings.get().maxConcurrentDownloads
    while (this.running < max) {
      const next = this.history.list().find((j) => j.state === 'queued')
      if (!next) return
      this.running += 1
      void this.runJob(next).finally(() => {
        this.running -= 1
        void this.pump()
      })
    }
  }

  private async runJob(job: StoredDownloadJob): Promise<void> {
    const controller = new AbortController()
    this.active.set(job.id, { controller })
    this.updateState(job.id, 'downloading')

    try {
      const request = JSON.parse(job.requestJson) as EnqueueDownloadRequest
      const outputs = await this.media.download({
        request,
        jobId: job.id,
        signal: controller.signal,
        onProgress: (p) => {
          if (p.state === 'processing') {
            const current = this.history.get(job.id)
            if (current && current.state === 'downloading') {
              this.updateState(job.id, 'processing')
            }
          }
          this.emitProgressThrottled(p)
        }
      })

      this.updateState(job.id, 'completed', { outputPaths: outputs })
      if (this.settings.get().openFolderOnComplete && outputs[0]) {
        await shell.showItemInFolder(outputs[0])
      }
    } catch (error) {
      const appErr = AppError.fromUnknown(error, ErrorCode.DOWNLOAD_FAILED)
      if (appErr.code === ErrorCode.CANCELED || controller.signal.aborted) {
        this.updateState(job.id, 'canceled', { error: appErr.toDto() })
      } else {
        this.logger.error('Job failed', {
          jobId: job.id,
          code: appErr.code,
          message: appErr.message
        })
        this.updateState(job.id, 'failed', { error: appErr.toDto() })
      }
    } finally {
      this.active.delete(job.id)
    }
  }
}
