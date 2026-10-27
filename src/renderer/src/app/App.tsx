import { useEffect, useState } from 'react'
import { AppShell } from '@/components/shell/AppShell'
import { HomePage } from '@/features/analyze/HomePage'
import { DownloadsPage } from '@/features/downloads/DownloadsPage'
import { LibraryPage } from '@/features/library/LibraryPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { I18nProvider } from '@/i18n'
import { hasApi } from '@/lib/api'
import { useAppStore, useLocale } from '@/stores/appStore'

function Pages(): React.JSX.Element {
  const page = useAppStore((s) => s.page)
  switch (page) {
    case 'downloads':
      return <DownloadsPage />
    case 'library':
      return <LibraryPage />
    case 'settings':
      return <SettingsPage />
    default:
      return <HomePage />
  }
}

function AppInner(): React.JSX.Element {
  const locale = useLocale()
  const setLocale = (next: typeof locale): void => {
    void useAppStore.getState().updateSettings({ locale: next })
  }

  return (
    <I18nProvider locale={locale} setLocale={setLocale}>
      <AppShell>
        <Pages />
      </AppShell>
    </I18nProvider>
  )
}

function BridgeMissing(): React.JSX.Element {
  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        color: '#e8eefc',
        fontFamily: 'Inter, sans-serif',
        background: '#0b0f17'
      }}
    >
      <div style={{ maxWidth: 480 }}>
        <h1 style={{ fontSize: 20, marginBottom: 8 }}>Nie udało się uruchomić mostka aplikacji</h1>
        <p style={{ opacity: 0.75, lineHeight: 1.5, marginBottom: 16 }}>
          Preload nie udostępnił <code>window.api</code>. Zamknij aplikację i uruchom ponownie{' '}
          <code>npm run dev</code>.
        </p>
        <p style={{ opacity: 0.55, fontSize: 13 }}>
          If this persists, check the main-process terminal for “[main] Preload failed”.
        </p>
      </div>
    </div>
  )
}

export function App(): React.JSX.Element {
  const loadSettings = useAppStore((s) => s.loadSettings)
  const subscribeJobs = useAppStore((s) => s.subscribeJobs)
  const [ready, setReady] = useState(false)
  const [bridgeOk, setBridgeOk] = useState(true)

  useEffect(() => {
    if (!hasApi()) {
      setBridgeOk(false)
      setReady(true)
      return
    }
    setBridgeOk(true)
    void loadSettings()
    const unsub = subscribeJobs()
    setReady(true)
    return unsub
  }, [loadSettings, subscribeJobs])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.ctrlKey && e.key === '1') useAppStore.getState().setPage('home')
      if (e.ctrlKey && e.key === '2') useAppStore.getState().setPage('downloads')
      if (e.ctrlKey && e.key === '3') useAppStore.getState().setPage('library')
      if (e.ctrlKey && e.key === '4') useAppStore.getState().setPage('settings')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!ready) {
    return <div style={{ height: '100%', background: '#0b0f17' }} />
  }

  if (!bridgeOk) {
    return <BridgeMissing />
  }

  return <AppInner />
}
