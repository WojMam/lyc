import { useEffect, useState } from 'react'
import type {
  AudioFormat,
  AudioQuality,
  QualityMode,
  TranscriptExportFormat,
  VideoContainer,
  VideoMetadata
} from '@shared/domain/types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useI18n } from '@/i18n'
import { useAppStore } from '@/stores/appStore'
import type { EnqueueDownloadRequest } from '@shared/schemas/ipc'

type Action =
  'video' | 'audio' | 'transcript' | 'thumbnail' | 'metadata' | 'description' | 'chapters'

export function ActionDialog({
  action,
  video,
  open,
  onOpenChange
}: {
  action: Action
  video: VideoMetadata
  open: boolean
  onOpenChange: (open: boolean) => void
}): React.JSX.Element {
  const { t } = useI18n()
  const settings = useAppStore((s) => s.settings)
  const setPage = useAppStore((s) => s.setPage)
  const [outputDirectory, setOutputDirectory] = useState(settings?.downloadDirectory ?? '')
  const [qualityMode, setQualityMode] = useState<QualityMode>(settings?.qualityMode ?? 'best_up_to')
  const [height, setHeight] = useState<number | undefined>(
    typeof settings?.preferredVideoQuality === 'number'
      ? settings.preferredVideoQuality
      : video.resolutions[0]?.height
  )
  const [container, setContainer] = useState<VideoContainer>(settings?.preferredContainer ?? 'auto')
  const [embedMetadata, setEmbedMetadata] = useState(true)
  const [audioFormat, setAudioFormat] = useState<AudioFormat>(
    settings?.preferredAudioFormat ?? 'mp3'
  )
  const [audioQuality, setAudioQuality] = useState<AudioQuality>(
    settings?.preferredAudioQuality ?? 'vbr_high'
  )
  const [language, setLanguage] = useState(
    settings?.preferredTranscriptLanguage ?? video.subtitles[0]?.language ?? 'en'
  )
  const [preferManual, setPreferManual] = useState(true)
  const [transcriptFormat, setTranscriptFormat] = useState<TranscriptExportFormat>('txt')
  const [includeRaw, setIncludeRaw] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (settings?.downloadDirectory) setOutputDirectory(settings.downloadDirectory)
  }, [settings?.downloadDirectory])

  const browse = async (): Promise<void> => {
    const res = await window.api.selectDirectory()
    if (res.ok && res.data) setOutputDirectory(res.data)
  }

  const titles: Record<Action, string> = {
    video: t.preview.downloadVideo,
    audio: t.preview.downloadAudio,
    transcript: t.preview.downloadTranscript,
    thumbnail: t.preview.downloadThumbnail,
    metadata: t.preview.exportMetadata,
    description: t.preview.exportDescription,
    chapters: t.preview.exportChapters
  }

  const start = async (): Promise<void> => {
    setSubmitting(true)
    setError(null)
    let request: EnqueueDownloadRequest
    const base = {
      url: video.url,
      videoId: video.id,
      title: video.title
    }
    switch (action) {
      case 'video':
        request = {
          action: 'video',
          ...base,
          options: {
            qualityMode,
            height: qualityMode === 'best' ? undefined : height,
            container,
            embedMetadata,
            outputDirectory
          }
        }
        break
      case 'audio':
        request = {
          action: 'audio',
          ...base,
          options: { format: audioFormat, quality: audioQuality, outputDirectory }
        }
        break
      case 'transcript':
        request = {
          action: 'transcript',
          ...base,
          options: { language, preferManual, format: transcriptFormat, outputDirectory }
        }
        break
      case 'thumbnail':
        request = { action: 'thumbnail', ...base, options: { outputDirectory } }
        break
      case 'metadata':
        request = { action: 'metadata', ...base, options: { outputDirectory, includeRaw } }
        break
      case 'description':
        request = { action: 'description', ...base, options: { outputDirectory } }
        break
      case 'chapters':
        request = { action: 'chapters', ...base, options: { outputDirectory } }
        break
    }

    const res = await window.api.enqueueDownload(request)
    setSubmitting(false)
    if (!res.ok) {
      setError(res.error.message)
      return
    }
    onOpenChange(false)
    setPage('downloads')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titles[action]}</DialogTitle>
          <DialogDescription className="truncate">{video.title}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {action === 'video' && (
            <>
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
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
                    value={height ?? ''}
                    onChange={(e) => setHeight(Number(e.target.value))}
                  >
                    {video.resolutions.map((r) => (
                      <option key={r.height} value={r.height}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                )}
                <p className="text-xs text-muted-foreground">
                  {qualityMode === 'exact' ? t.dialog.qualityExactHint : t.dialog.qualityUpToHint}
                </p>
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
              <div className="flex items-center justify-between">
                <Label htmlFor="embed">{t.dialog.embedMetadata}</Label>
                <Switch id="embed" checked={embedMetadata} onCheckedChange={setEmbedMetadata} />
              </div>
            </>
          )}

          {action === 'audio' && (
            <>
              <div className="space-y-2">
                <Label>{t.dialog.audioFormat}</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
                  value={audioFormat}
                  onChange={(e) => setAudioFormat(e.target.value as AudioFormat)}
                >
                  <option value="mp3">MP3</option>
                  <option value="m4a">M4A</option>
                  <option value="opus">Opus</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>{t.dialog.audioQuality}</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
                  value={audioQuality}
                  onChange={(e) => setAudioQuality(e.target.value as AudioQuality)}
                >
                  <option value="vbr_high">VBR High</option>
                  <option value="192k">192 kbps</option>
                  <option value="128k">128 kbps</option>
                </select>
              </div>
            </>
          )}

          {action === 'transcript' && (
            <>
              <div className="space-y-2">
                <Label>{t.dialog.language}</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  {video.subtitles.map((s) => (
                    <option key={`${s.language}-${s.origin}`} value={s.language}>
                      {s.language} ({s.origin})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="manual">{t.dialog.preferManual}</Label>
                <Switch id="manual" checked={preferManual} onCheckedChange={setPreferManual} />
              </div>
              <div className="space-y-2">
                <Label>{t.dialog.transcriptFormat}</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
                  value={transcriptFormat}
                  onChange={(e) => setTranscriptFormat(e.target.value as TranscriptExportFormat)}
                >
                  <option value="txt">TXT</option>
                  <option value="txt_timestamps">TXT + timestamps</option>
                  <option value="srt">SRT</option>
                  <option value="vtt">VTT</option>
                  <option value="json">JSON</option>
                </select>
              </div>
            </>
          )}

          {action === 'metadata' && (
            <div className="flex items-center justify-between">
              <Label htmlFor="raw">{t.dialog.includeRaw}</Label>
              <Switch id="raw" checked={includeRaw} onCheckedChange={setIncludeRaw} />
            </div>
          )}

          <div className="space-y-2">
            <Label>{t.dialog.outputDir}</Label>
            <div className="flex gap-2">
              <Input value={outputDirectory} onChange={(e) => setOutputDirectory(e.target.value)} />
              <Button type="button" variant="secondary" onClick={() => void browse()}>
                {t.dialog.browse}
              </Button>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              {t.dialog.cancel}
            </Button>
            <Button onClick={() => void start()} disabled={submitting || !outputDirectory}>
              {t.dialog.start}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
