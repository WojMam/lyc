export const IpcChannels = {
  AnalyzeUrl: 'analyze.url',
  DownloadsEnqueue: 'downloads.enqueue',
  DownloadsCancel: 'downloads.cancel',
  DownloadsRetry: 'downloads.retry',
  DownloadsRemove: 'downloads.remove',
  DownloadsList: 'downloads.list',
  DownloadsOpenFile: 'downloads.openFile',
  DownloadsOpenFolder: 'downloads.openFolder',
  HistoryList: 'history.list',
  HistoryClearCompleted: 'history.clearCompleted',
  SettingsGet: 'settings.get',
  SettingsSet: 'settings.set',
  ToolsHealth: 'tools.health',
  DiagnosticsExportLogs: 'diagnostics.exportLogs',
  ShellOpenExternal: 'shell.openExternal',
  DialogSelectDirectory: 'dialog.selectDirectory',
  ClipboardReadText: 'clipboard.readText'
} as const

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels]

export const IpcEvents = {
  DownloadsProgress: 'downloads.progress',
  DownloadsUpdated: 'downloads.updated'
} as const

export type IpcEvent = (typeof IpcEvents)[keyof typeof IpcEvents]
