import type { AppErrorDto, DownloadAction, JobState } from './types'

export interface StoredDownloadJob {
  id: string
  action: DownloadAction
  title: string
  url: string
  videoId?: string
  playlistId?: string
  state: JobState
  createdAt: string
  updatedAt: string
  outputPaths: string[]
  outputDirectory: string
  error?: AppErrorDto
  requestJson: string
  playlistItemStatuses?: Array<{
    id: string
    title: string
    state: JobState
    error?: AppErrorDto
    outputPath?: string
  }>
}
