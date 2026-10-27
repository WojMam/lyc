import { BrowserWindow, clipboard, dialog, ipcMain, shell } from 'electron'
import { IpcChannels, IpcEvents } from '../../shared/contracts/channels'
import {
  analyzeUrlRequestSchema,
  enqueueDownloadRequestSchema,
  jobIdSchema,
  openExternalSchema,
  openPathSchema,
  settingsPatchSchema
} from '../../shared/schemas/ipc'
import { AppError } from '../../shared/errors/AppError'
import { ErrorCode } from '../../shared/errors/codes'
import type { AnalyzeService } from '../services/AnalyzeService'
import type { DownloadQueueService } from '../services/DownloadQueueService'
import type { SettingsStore } from '../infrastructure/persistence/SettingsStore'
import type { HistoryStore } from '../infrastructure/persistence/HistoryStore'
import type { ToolPathResolver } from '../infrastructure/tools/ToolPathResolver'
import type { Logger } from '../infrastructure/persistence/Logger'
import path from 'path'

interface Deps {
  analyze: AnalyzeService
  queue: DownloadQueueService
  settings: SettingsStore
  history: HistoryStore
  tools: ToolPathResolver
  logger: Logger
  getMainWindow: () => BrowserWindow | null
}

function wrap<T>(
  fn: () => Promise<T> | T
): Promise<{ ok: true; data: T } | { ok: false; error: ReturnType<AppError['toDto']> }> {
  return Promise.resolve()
    .then(fn)
    .then((data) => ({ ok: true as const, data }))
    .catch((error: unknown) => {
      const appErr = AppError.fromUnknown(error)
      return { ok: false as const, error: appErr.toDto() }
    })
}

const ALLOWED_EXTERNAL_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
  'music.youtube.com'
])

export function registerIpc(deps: Deps): void {
  ipcMain.handle(IpcChannels.AnalyzeUrl, (_e, payload) =>
    wrap(async () => {
      const req = analyzeUrlRequestSchema.parse(payload)
      return deps.analyze.analyze(req.url, req.intent)
    })
  )

  ipcMain.handle(IpcChannels.DownloadsEnqueue, (_e, payload) =>
    wrap(() => {
      const req = enqueueDownloadRequestSchema.parse(payload)
      return deps.queue.enqueue(req)
    })
  )

  ipcMain.handle(IpcChannels.DownloadsCancel, (_e, payload) =>
    wrap(async () => {
      const { jobId } = jobIdSchema.parse(payload)
      await deps.queue.cancel(jobId)
      return true
    })
  )

  ipcMain.handle(IpcChannels.DownloadsRetry, (_e, payload) =>
    wrap(async () => {
      const { jobId } = jobIdSchema.parse(payload)
      await deps.queue.retry(jobId)
      return true
    })
  )

  ipcMain.handle(IpcChannels.DownloadsRemove, (_e, payload) =>
    wrap(() => {
      const { jobId } = jobIdSchema.parse(payload)
      deps.queue.remove(jobId)
      return true
    })
  )

  ipcMain.handle(IpcChannels.DownloadsList, () => wrap(() => deps.queue.list()))

  ipcMain.handle(IpcChannels.DownloadsOpenFile, (_e, payload) =>
    wrap(async () => {
      const { path: p } = openPathSchema.parse(payload)
      await deps.queue.openFile(p)
      return true
    })
  )

  ipcMain.handle(IpcChannels.DownloadsOpenFolder, (_e, payload) =>
    wrap(async () => {
      const { path: p } = openPathSchema.parse(payload)
      await deps.queue.openFolder(p)
      return true
    })
  )

  ipcMain.handle(IpcChannels.HistoryList, () => wrap(() => deps.history.list()))

  ipcMain.handle(IpcChannels.HistoryClearCompleted, () =>
    wrap(() => {
      deps.history.clearCompleted()
      return true
    })
  )

  ipcMain.handle(IpcChannels.SettingsGet, () => wrap(() => deps.settings.get()))

  ipcMain.handle(IpcChannels.SettingsSet, (_e, payload) =>
    wrap(() => {
      const patch = settingsPatchSchema.parse(payload)
      return deps.settings.set(patch)
    })
  )

  ipcMain.handle(IpcChannels.ToolsHealth, () => wrap(() => deps.tools.checkHealth()))

  ipcMain.handle(IpcChannels.DiagnosticsExportLogs, () =>
    wrap(async () => {
      const win = deps.getMainWindow()
      const result = win
        ? await dialog.showSaveDialog(win, {
            title: 'Export diagnostics log',
            defaultPath: path.join(deps.logger.getLogDirectory(), 'diagnostics.log'),
            filters: [{ name: 'Log', extensions: ['log', 'txt'] }]
          })
        : await dialog.showSaveDialog({
            title: 'Export diagnostics log',
            defaultPath: path.join(deps.logger.getLogDirectory(), 'diagnostics.log'),
            filters: [{ name: 'Log', extensions: ['log', 'txt'] }]
          })
      if (result.canceled || !result.filePath) return null
      const { copyFile } = await import('fs/promises')
      await copyFile(deps.logger.getCurrentLogFile(), result.filePath)
      return result.filePath
    })
  )

  ipcMain.handle(IpcChannels.ShellOpenExternal, (_e, payload) =>
    wrap(async () => {
      const { url } = openExternalSchema.parse(payload)
      const parsed = new URL(url)
      if (parsed.protocol !== 'https:') {
        throw new AppError(ErrorCode.VALIDATION_FAILED, 'Only https external links are allowed')
      }
      if (!ALLOWED_EXTERNAL_HOSTS.has(parsed.hostname.toLowerCase())) {
        throw new AppError(ErrorCode.VALIDATION_FAILED, 'External host not allowlisted')
      }
      await shell.openExternal(parsed.toString())
      return true
    })
  )

  ipcMain.handle(IpcChannels.DialogSelectDirectory, () =>
    wrap(async () => {
      const win = deps.getMainWindow()
      const result = win
        ? await dialog.showOpenDialog(win, {
            properties: ['openDirectory', 'createDirectory']
          })
        : await dialog.showOpenDialog({
            properties: ['openDirectory', 'createDirectory']
          })
      if (result.canceled || !result.filePaths[0]) return null
      return result.filePaths[0]
    })
  )

  ipcMain.handle(IpcChannels.ClipboardReadText, () => wrap(() => clipboard.readText()))

  deps.queue.onUpdated((jobs) => {
    const win = deps.getMainWindow()
    win?.webContents.send(IpcEvents.DownloadsUpdated, jobs)
  })

  deps.queue.onProgress((progress) => {
    const win = deps.getMainWindow()
    win?.webContents.send(IpcEvents.DownloadsProgress, progress)
  })
}
