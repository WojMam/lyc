import { useEffect, useState } from 'react'
import type { AppLocale, ThemePreference } from '@shared/domain/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useI18n } from '@/i18n'
import { useAppStore } from '@/stores/appStore'

export function SettingsPage(): React.JSX.Element {
  const { t, setLocale } = useI18n()
  const settings = useAppStore((s) => s.settings)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const tools = useAppStore((s) => s.tools)
  const refreshTools = useAppStore((s) => s.refreshTools)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    void refreshTools()
  }, [refreshTools])

  if (!settings) {
    return <div className="p-8 text-sm text-muted-foreground">{t.common.loading}</div>
  }

  const save = async (patch: Parameters<typeof updateSettings>[0]): Promise<void> => {
    await updateSettings(patch)
    if (patch.locale) setLocale(patch.locale)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const statusLabel = (status: string): string => {
    if (status === 'available') return t.settings.available
    if (status === 'missing') return t.settings.missing
    if (status === 'invalid') return t.settings.invalid
    return t.settings.outdated
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-border/60 px-8 py-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t.settings.title}</h1>
        {saved && <span className="text-sm text-primary">{t.settings.saved}</span>}
      </header>
      <div className="min-h-0 flex-1 space-y-8 overflow-y-auto px-8 py-6 scrollbar-thin">
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t.settings.general}
          </h2>
          <div className="space-y-2">
            <Label>{t.settings.downloadDir}</Label>
            <div className="flex gap-2">
              <Input
                value={settings.downloadDirectory}
                onChange={(e) => void save({ downloadDirectory: e.target.value })}
              />
              <Button
                variant="secondary"
                onClick={async () => {
                  const res = await window.api.selectDirectory()
                  if (res.ok && res.data) await save({ downloadDirectory: res.data })
                }}
              >
                …
              </Button>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t.settings.language}</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
                value={settings.locale}
                onChange={(e) => void save({ locale: e.target.value as AppLocale })}
              >
                <option value="pl">Polski</option>
                <option value="en">English</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>{t.settings.appearance}</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
                value={settings.theme}
                onChange={(e) => void save({ theme: e.target.value as ThemePreference })}
              >
                <option value="system">{t.settings.themeSystem}</option>
                <option value="dark">{t.settings.themeDark}</option>
                <option value="light">{t.settings.themeLight}</option>
              </select>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
            <Label htmlFor="open-folder">{t.settings.openFolderOnComplete}</Label>
            <Switch
              id="open-folder"
              checked={settings.openFolderOnComplete}
              onCheckedChange={(v) => void save({ openFolderOnComplete: v })}
            />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t.settings.downloads}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t.settings.preferredQuality}</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
                value={String(settings.preferredVideoQuality)}
                onChange={(e) => {
                  const v = e.target.value
                  void save({
                    preferredVideoQuality: v === 'best' ? 'best' : Number(v)
                  })
                }}
              >
                <option value="best">Best</option>
                <option value="2160">2160p</option>
                <option value="1440">1440p</option>
                <option value="1080">1080p</option>
                <option value="720">720p</option>
                <option value="480">480p</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>{t.settings.preferredContainer}</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
                value={settings.preferredContainer}
                onChange={(e) =>
                  void save({
                    preferredContainer: e.target.value as 'mp4' | 'mkv' | 'auto'
                  })
                }
              >
                <option value="auto">Auto</option>
                <option value="mp4">MP4</option>
                <option value="mkv">MKV</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>{t.settings.preferredAudio}</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
                value={settings.preferredAudioFormat}
                onChange={(e) =>
                  void save({ preferredAudioFormat: e.target.value as 'mp3' | 'm4a' | 'opus' })
                }
              >
                <option value="mp3">MP3</option>
                <option value="m4a">M4A</option>
                <option value="opus">Opus</option>
              </select>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3 sm:col-span-2">
              <Label htmlFor="embed-cover">{t.settings.embedAudioCover}</Label>
              <Switch
                id="embed-cover"
                checked={settings.embedAudioThumbnail ?? true}
                onCheckedChange={(v) => void save({ embedAudioThumbnail: v })}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3 sm:col-span-2">
              <Label htmlFor="embed-audio-meta">{t.settings.embedAudioMetadata}</Label>
              <Switch
                id="embed-audio-meta"
                checked={settings.embedAudioMetadata ?? true}
                onCheckedChange={(v) => void save({ embedAudioMetadata: v })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.settings.preferredTranscriptLang}</Label>
              <Input
                value={settings.preferredTranscriptLanguage}
                onChange={(e) => void save({ preferredTranscriptLanguage: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.settings.maxConcurrent}</Label>
              <Input
                type="number"
                min={1}
                max={3}
                value={settings.maxConcurrentDownloads}
                onChange={(e) =>
                  void save({
                    maxConcurrentDownloads: Math.min(3, Math.max(1, Number(e.target.value) || 1))
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>{t.settings.maxRetries}</Label>
              <Input
                type="number"
                min={0}
                max={5}
                value={settings.maxRetries}
                onChange={(e) =>
                  void save({ maxRetries: Math.min(5, Math.max(0, Number(e.target.value) || 0)) })
                }
              />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t.settings.tools}
            </h2>
            <Button size="sm" variant="secondary" onClick={() => void refreshTools()}>
              Refresh
            </Button>
          </div>
          <ul className="space-y-2">
            {tools.map((tool) => (
              <li
                key={tool.name}
                className="rounded-lg border border-border bg-card/40 px-4 py-3 text-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{tool.name}</span>
                  <span
                    className={
                      tool.status === 'available' ? 'text-emerald-400' : 'text-destructive'
                    }
                  >
                    {statusLabel(tool.status)}
                    {tool.version ? ` · ${tool.version}` : ''}
                  </span>
                </div>
                {tool.path && (
                  <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                    {tool.path}
                  </p>
                )}
                {tool.detail && <p className="mt-1 text-xs text-muted-foreground">{tool.detail}</p>}
              </li>
            ))}
          </ul>
          <Button variant="outline" onClick={() => void window.api.exportLogs()}>
            {t.settings.exportLogs}
          </Button>
        </section>
      </div>
    </div>
  )
}
