import { create } from 'zustand'
import type {
  AnalyzedMedia,
  ApplicationSettings,
  AppLocale,
  DownloadProgress,
  MediaSource,
  ThemePreference,
  ToolHealth
} from '@shared/domain/types'
import type { StoredDownloadJob } from '@shared/domain/jobs'
import type { AppErrorDto } from '@shared/domain/types'
import { validateYouTubeUrl } from '@shared/domain/youtubeUrl'
import { getApi } from '@/lib/api'

type Page = 'home' | 'downloads' | 'library' | 'settings'

interface AppState {
  page: Page
  url: string
  analyzing: boolean
  analyzeError: AppErrorDto | null
  media: AnalyzedMedia | null
  ambiguousSource: MediaSource | null
  settings: ApplicationSettings | null
  jobs: StoredDownloadJob[]
  progressByJob: Record<string, DownloadProgress>
  tools: ToolHealth[]
  setPage: (page: Page) => void
  setUrl: (url: string) => void
  loadSettings: () => Promise<void>
  updateSettings: (patch: Partial<ApplicationSettings>) => Promise<void>
  applyTheme: (theme: ThemePreference) => void
  analyze: (intent?: 'auto' | 'video' | 'playlist') => Promise<void>
  clearMedia: () => void
  refreshJobs: () => Promise<void>
  refreshTools: () => Promise<void>
  subscribeJobs: () => () => void
}

function applyDocumentTheme(theme: ThemePreference): void {
  const root = document.documentElement
  const preferDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const dark = theme === 'dark' || (theme === 'system' && preferDark)
  root.classList.toggle('dark', dark)
  root.classList.toggle('light', !dark)
}

export const useAppStore = create<AppState>((set, get) => ({
  page: 'home',
  url: '',
  analyzing: false,
  analyzeError: null,
  media: null,
  ambiguousSource: null,
  settings: null,
  jobs: [],
  progressByJob: {},
  tools: [],

  setPage: (page) => set({ page }),
  setUrl: (url) => set({ url }),

  applyTheme: (theme) => applyDocumentTheme(theme),

  loadSettings: async () => {
    const res = await getApi().getSettings()
    if (res.ok) {
      set({ settings: res.data })
      applyDocumentTheme(res.data.theme)
      document.documentElement.lang = res.data.locale
    }
  },

  updateSettings: async (patch) => {
    const res = await getApi().setSettings(patch)
    if (res.ok) {
      set({ settings: res.data })
      if (patch.theme) applyDocumentTheme(res.data.theme)
      if (patch.locale) document.documentElement.lang = res.data.locale
    }
  },

  analyze: async (intent = 'auto') => {
    const { url, analyzing } = get()
    if (analyzing) return
    const validated = validateYouTubeUrl(url)
    if (!validated.ok) {
      set({
        analyzeError: {
          code: 'INVALID_URL',
          message: 'Invalid YouTube URL',
          retryable: false
        },
        media: null
      })
      return
    }

    if (validated.source.ambiguous && intent === 'auto') {
      set({ ambiguousSource: validated.source, analyzeError: null, media: null })
      return
    }

    set({ analyzing: true, analyzeError: null, ambiguousSource: null })
    const res = await getApi().analyzeUrl({ url: validated.source.url, intent })
    if (!res.ok) {
      set({ analyzing: false, analyzeError: res.error, media: null })
      return
    }
    set({ analyzing: false, media: res.data, analyzeError: null })
  },

  clearMedia: () => set({ media: null, analyzeError: null, ambiguousSource: null, url: '' }),

  refreshJobs: async () => {
    const res = await getApi().listDownloads()
    if (res.ok) set({ jobs: res.data })
  },

  refreshTools: async () => {
    const res = await getApi().toolsHealth()
    if (res.ok) set({ tools: res.data })
  },

  subscribeJobs: () => {
    const api = getApi()
    const unsubUpdated = api.onDownloadsUpdated((jobs) => set({ jobs }))
    const unsubProgress = api.onDownloadsProgress((progress) =>
      set((s) => ({
        progressByJob: { ...s.progressByJob, [progress.jobId]: progress }
      }))
    )
    void get().refreshJobs()
    return () => {
      unsubUpdated()
      unsubProgress()
    }
  }
}))

export function useLocale(): AppLocale {
  return useAppStore((s) => s.settings?.locale ?? 'pl')
}
