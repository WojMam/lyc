import { useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { PlaylistMetadata, QualityMode, VideoContainer } from '@shared/domain/types'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { useI18n } from '@/i18n'
import { useAppStore } from '@/stores/appStore'
import { formatDuration } from '@/lib/utils'

export function PlaylistPreview({ playlist }: { playlist: PlaylistMetadata }): React.JSX.Element {
  const { t } = useI18n()
  const settings = useAppStore((s) => s.settings)
  const setPage = useAppStore((s) => s.setPage)
  const available = useMemo(
    () => playlist.entries.filter((e) => !e.unavailable),
    [playlist.entries]
  )
  const [selected, setSelected] = useState<Set<string>>(() => new Set(available.map((e) => e.id)))
  const [dialogOpen, setDialogOpen] = useState(false)
  const [outputDirectory, setOutputDirectory] = useState(settings?.downloadDirectory ?? '')
  const [qualityMode, setQualityMode] = useState<QualityMode>(settings?.qualityMode ?? 'best_up_to')
  const [height, setHeight] = useState<number | undefined>(
    typeof settings?.preferredVideoQuality === 'number' ? settings.preferredVideoQuality : 1080
  )
  const [container, setContainer] = useState<VideoContainer>(settings?.preferredContainer ?? 'auto')
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: playlist.entries.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
    overscan: 8
  })

  const toggle = (id: string, value: boolean): void => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (value) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const start = async (): Promise<void> => {
    const res = await window.api.enqueueDownload({
      action: 'playlist',
      url: playlist.url,
      playlistId: playlist.id,
      title: playlist.title,
      options: {
        entryIds: [...selected],
        qualityMode,
        height: qualityMode === 'best' ? undefined : height,
        container,
        outputDirectory
      }
    })
    if (res.ok) {
      setDialogOpen(false)
      setPage('downloads')
    }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start gap-5">
        {playlist.thumbnailUrl && (
          <img
            src={playlist.thumbnailUrl}
            alt=""
            className="h-28 w-48 rounded-xl object-cover border border-border"
            referrerPolicy="no-referrer"
          />
        )}
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{playlist.title}</h2>
          {playlist.channel && (
            <p className="mt-1 text-sm text-muted-foreground">{playlist.channel}</p>
          )}
          <p className="mt-2 text-sm text-muted-foreground">
            {playlist.entryCount} {t.playlist.items} · {selected.size} {t.playlist.selected}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setSelected(new Set(available.map((e) => e.id)))}
        >
          {t.playlist.selectAll}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
          {t.playlist.deselectAll}
        </Button>
        <Button size="sm" disabled={selected.size === 0} onClick={() => setDialogOpen(true)}>
          {t.playlist.downloadSelected}
        </Button>
      </div>

      <div
        ref={parentRef}
        className="h-[420px] overflow-auto rounded-xl border border-border bg-card/40 scrollbar-thin"
      >
        <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
          {virtualizer.getVirtualItems().map((row) => {
            const entry = playlist.entries[row.index]!
            return (
              <div
                key={entry.id + entry.index}
                className="absolute left-0 top-0 flex w-full items-center gap-3 border-b border-border/50 px-3"
                style={{ height: row.size, transform: `translateY(${row.start}px)` }}
              >
                <Checkbox
                  checked={selected.has(entry.id)}
                  disabled={entry.unavailable}
                  onCheckedChange={(v) => toggle(entry.id, v)}
                />
                <span className="w-8 text-xs text-muted-foreground">
                  {String(entry.index).padStart(3, '0')}
                </span>
                {entry.thumbnailUrl ? (
                  <img
                    src={entry.thumbnailUrl}
                    alt=""
                    className="h-10 w-16 rounded object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="h-10 w-16 rounded bg-secondary" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {entry.unavailable ? t.playlist.unavailable : entry.title}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDuration(entry.durationSec)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.playlist.downloadSelected}</DialogTitle>
            <DialogDescription>
              {selected.size} {t.playlist.items}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t.dialog.quality}</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
                value={qualityMode}
                onChange={(e) => setQualityMode(e.target.value as QualityMode)}
              >
                <option value="best">{t.dialog.qualityBest}</option>
                <option value="best_up_to">{t.dialog.qualityUpTo}</option>
                <option value="exact">{t.dialog.qualityExact}</option>
              </select>
              {qualityMode !== 'best' && (
                <Input
                  type="number"
                  value={height ?? 1080}
                  onChange={(e) => setHeight(Number(e.target.value))}
                />
              )}
            </div>
            <div className="space-y-2">
              <Label>{t.dialog.container}</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
                value={container}
                onChange={(e) => setContainer(e.target.value as VideoContainer)}
              >
                <option value="auto">{t.dialog.containerAuto}</option>
                <option value="mp4">MP4</option>
                <option value="mkv">MKV</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>{t.dialog.outputDir}</Label>
              <div className="flex gap-2">
                <Input
                  value={outputDirectory}
                  onChange={(e) => setOutputDirectory(e.target.value)}
                />
                <Button
                  variant="secondary"
                  onClick={async () => {
                    const res = await window.api.selectDirectory()
                    if (res.ok && res.data) setOutputDirectory(res.data)
                  }}
                >
                  {t.dialog.browse}
                </Button>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDialogOpen(false)}>
                {t.dialog.cancel}
              </Button>
              <Button onClick={() => void start()}>{t.dialog.start}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
