import type { PlaylistMetadata, Transcript, VideoMetadata } from '../../../shared/domain/types'
import type { EnqueueDownloadRequest } from '../../../shared/schemas/ipc'
import type { DownloadProgress } from '../../../shared/domain/types'

export interface AnalyzeOptions {
  intent: 'video' | 'playlist'
  signal?: AbortSignal
}

export interface DownloadExecutionOptions {
  request: EnqueueDownloadRequest
  jobId: string
  signal?: AbortSignal
  onProgress?: (progress: DownloadProgress) => void
}

export interface IMediaProvider {
  analyzeVideo(url: string, options?: { signal?: AbortSignal }): Promise<VideoMetadata>
  analyzePlaylist(url: string, options?: { signal?: AbortSignal }): Promise<PlaylistMetadata>
  download(options: DownloadExecutionOptions): Promise<string[]>
  fetchTranscript(
    url: string,
    language: string,
    preferManual: boolean,
    signal?: AbortSignal
  ): Promise<Transcript>
}
