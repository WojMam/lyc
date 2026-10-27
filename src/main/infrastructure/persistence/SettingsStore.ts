import { app } from 'electron'
import path from 'path'
import type { ApplicationSettings } from '../../../shared/domain/types'
import { JsonFileStore } from './JsonFileStore'

const DEFAULTS: ApplicationSettings = {
  downloadDirectory: '',
  locale: 'pl',
  theme: 'system',
  openFolderOnComplete: false,
  preferredVideoQuality: 'best',
  qualityMode: 'best_up_to',
  preferredContainer: 'auto',
  preferredAudioFormat: 'mp3',
  preferredAudioQuality: 'vbr_high',
  preferredTranscriptLanguage: 'pl',
  existingFilePolicy: 'rename',
  maxConcurrentDownloads: 1,
  maxRetries: 2,
  toolOverrides: {}
}

export class SettingsStore {
  private store: JsonFileStore<{ settings: ApplicationSettings }>

  constructor() {
    this.store = new JsonFileStore(app.getPath('userData'), 'settings', {
      settings: {
        ...DEFAULTS,
        downloadDirectory: path.join(app.getPath('downloads'), 'Local YouTube Companion')
      }
    })
  }

  get(): ApplicationSettings {
    return { ...DEFAULTS, ...this.store.get().settings }
  }

  set(patch: Partial<ApplicationSettings>): ApplicationSettings {
    const current = this.get()
    const next: ApplicationSettings = {
      ...current,
      ...patch,
      toolOverrides: { ...current.toolOverrides, ...patch.toolOverrides }
    }
    this.store.set({ settings: next })
    return next
  }
}
