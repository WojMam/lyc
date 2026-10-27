import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { IpcChannels, IpcEvents } from '../shared/contracts/channels'
import type {
  AnalyzedMedia,
  ApplicationSettings,
  DownloadProgress,
  ToolHealth
} from '../shared/domain/types'
import type { EnqueueDownloadRequest } from '../shared/schemas/ipc'
import type { StoredDownloadJob } from '../shared/domain/jobs'
import type { AppErrorDto } from '../shared/domain/types'

type Result<T> = { ok: true; data: T } | { ok: false; error: AppErrorDto }

const api = {
  analyzeUrl: (payload: {
    url: string
    intent?: 'auto' | 'video' | 'playlist'
  }): Promise<Result<AnalyzedMedia>> => ipcRenderer.invoke(IpcChannels.AnalyzeUrl, payload),

  enqueueDownload: (payload: EnqueueDownloadRequest): Promise<Result<StoredDownloadJob>> =>
    ipcRenderer.invoke(IpcChannels.DownloadsEnqueue, payload),

  cancelDownload: (jobId: string): Promise<Result<boolean>> =>
    ipcRenderer.invoke(IpcChannels.DownloadsCancel, { jobId }),

  retryDownload: (jobId: string): Promise<Result<boolean>> =>
    ipcRenderer.invoke(IpcChannels.DownloadsRetry, { jobId }),

  removeDownload: (jobId: string): Promise<Result<boolean>> =>
    ipcRenderer.invoke(IpcChannels.DownloadsRemove, { jobId }),

  listDownloads: (): Promise<Result<StoredDownloadJob[]>> =>
    ipcRenderer.invoke(IpcChannels.DownloadsList),

  openFile: (path: string): Promise<Result<boolean>> =>
    ipcRenderer.invoke(IpcChannels.DownloadsOpenFile, { path }),

  openFolder: (path: string): Promise<Result<boolean>> =>
    ipcRenderer.invoke(IpcChannels.DownloadsOpenFolder, { path }),

  listHistory: (): Promise<Result<StoredDownloadJob[]>> =>
    ipcRenderer.invoke(IpcChannels.HistoryList),

  clearCompletedHistory: (): Promise<Result<boolean>> =>
    ipcRenderer.invoke(IpcChannels.HistoryClearCompleted),

  getSettings: (): Promise<Result<ApplicationSettings>> =>
    ipcRenderer.invoke(IpcChannels.SettingsGet),

  setSettings: (patch: Partial<ApplicationSettings>): Promise<Result<ApplicationSettings>> =>
    ipcRenderer.invoke(IpcChannels.SettingsSet, patch),

  toolsHealth: (): Promise<Result<ToolHealth[]>> => ipcRenderer.invoke(IpcChannels.ToolsHealth),

  exportLogs: (): Promise<Result<string | null>> =>
    ipcRenderer.invoke(IpcChannels.DiagnosticsExportLogs),

  openExternal: (url: string): Promise<Result<boolean>> =>
    ipcRenderer.invoke(IpcChannels.ShellOpenExternal, { url }),

  selectDirectory: (): Promise<Result<string | null>> =>
    ipcRenderer.invoke(IpcChannels.DialogSelectDirectory),

  readClipboard: (): Promise<Result<string>> => ipcRenderer.invoke(IpcChannels.ClipboardReadText),

  onDownloadsUpdated: (callback: (jobs: StoredDownloadJob[]) => void): (() => void) => {
    const listener = (_event: IpcRendererEvent, jobs: StoredDownloadJob[]): void => callback(jobs)
    ipcRenderer.on(IpcEvents.DownloadsUpdated, listener)
    return () => ipcRenderer.removeListener(IpcEvents.DownloadsUpdated, listener)
  },

  onDownloadsProgress: (callback: (progress: DownloadProgress) => void): (() => void) => {
    const listener = (_event: IpcRendererEvent, progress: DownloadProgress): void =>
      callback(progress)
    ipcRenderer.on(IpcEvents.DownloadsProgress, listener)
    return () => ipcRenderer.removeListener(IpcEvents.DownloadsProgress, listener)
  }
}

try {
  contextBridge.exposeInMainWorld('api', api)
} catch (error) {
  console.error('[preload] Failed to expose window.api', error)
  throw error
}

export type CompanionApi = typeof api
