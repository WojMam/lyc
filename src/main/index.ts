import { app, BrowserWindow } from 'electron'
import { createMainWindow } from './app/createWindow'
import { ProcessRunner } from './infrastructure/processes/ProcessRunner'
import { SettingsStore } from './infrastructure/persistence/SettingsStore'
import { HistoryStore } from './infrastructure/persistence/HistoryStore'
import { Logger } from './infrastructure/persistence/Logger'
import { ToolPathResolver } from './infrastructure/tools/ToolPathResolver'
import { YtDlpMediaProvider } from './infrastructure/ytdlp/YtDlpMediaProvider'
import { AnalyzeService } from './services/AnalyzeService'
import { DownloadQueueService } from './services/DownloadQueueService'
import { registerIpc } from './ipc/registerIpc'
import treeKill from './infrastructure/processes/treeKill'

let mainWindow: BrowserWindow | null = null
const childPids = new Set<number>()

// Track is handled inside ProcessRunner via abort; on quit we rely on abort controllers

app.whenReady().then(() => {
  const logger = new Logger()
  const settings = new SettingsStore()
  const history = new HistoryStore()
  history.markActiveAsInterrupted()

  const runner = new ProcessRunner()
  const tools = new ToolPathResolver(runner, () => settings.get())
  const media = new YtDlpMediaProvider(runner, tools, logger)
  const analyze = new AnalyzeService(media, logger)
  const queue = new DownloadQueueService(media, history, settings, logger)

  registerIpc({
    analyze,
    queue,
    settings,
    history,
    tools,
    logger,
    getMainWindow: () => mainWindow
  })

  mainWindow = createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow()
    }
  })

  logger.info('Application started')
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  for (const pid of childPids) {
    void treeKill(pid)
  }
})

// Single instance
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}
