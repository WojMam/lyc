import { useCallback, useState } from 'react'
import { ClipboardPaste, Loader2, Search, X } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useI18n } from '@/i18n'
import { useAppStore } from '@/stores/appStore'
import { VideoPreview } from '@/components/media/VideoPreview'
import { PlaylistPreview } from '@/components/media/PlaylistPreview'
import { ErrorPanel } from '@/components/media/ErrorPanel'

export function HomePage(): React.JSX.Element {
  const { t } = useI18n()
  const url = useAppStore((s) => s.url)
  const setUrl = useAppStore((s) => s.setUrl)
  const analyzing = useAppStore((s) => s.analyzing)
  const media = useAppStore((s) => s.media)
  const analyzeError = useAppStore((s) => s.analyzeError)
  const ambiguousSource = useAppStore((s) => s.ambiguousSource)
  const analyze = useAppStore((s) => s.analyze)
  const clearMedia = useAppStore((s) => s.clearMedia)
  const [localError, setLocalError] = useState<string | null>(null)

  const onAnalyze = useCallback(() => {
    setLocalError(null)
    void analyze('auto')
  }, [analyze])

  const onPaste = async (): Promise<void> => {
    const res = await window.api.readClipboard()
    if (res.ok && res.data.trim()) {
      setUrl(res.data.trim())
      setLocalError(null)
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="shrink-0 border-b border-border/60 px-8 py-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t.home.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t.home.subtitle}</p>
        <div className="mt-5 flex gap-2">
          <div className="relative flex-1">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !analyzing) onAnalyze()
              }}
              placeholder={t.home.placeholder}
              className="h-12 pr-10 text-[15px]"
              disabled={analyzing}
              aria-label={t.home.placeholder}
            />
            {url && (
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => clearMedia()}
                aria-label={t.home.clear}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button type="button" variant="secondary" className="h-12" onClick={() => void onPaste()}>
            <ClipboardPaste className="h-4 w-4" />
            {t.home.paste}
          </Button>
          <Button
            type="button"
            className="h-12 min-w-[120px]"
            onClick={onAnalyze}
            disabled={analyzing || !url.trim()}
          >
            {analyzing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            {analyzing ? t.home.analyzing : t.home.analyze}
          </Button>
        </div>
        {localError && <p className="mt-2 text-sm text-destructive">{localError}</p>}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-8 py-6 scrollbar-thin">
        <AnimatePresence mode="wait">
          {analyzing && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="h-44 animate-pulse rounded-xl bg-secondary/60" />
              <div className="h-8 w-2/3 animate-pulse rounded bg-secondary/60" />
              <div className="h-4 w-1/3 animate-pulse rounded bg-secondary/40" />
            </motion.div>
          )}

          {!analyzing && ambiguousSource && (
            <motion.div
              key="ambiguous"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-border bg-card/70 p-6"
            >
              <p className="text-sm text-muted-foreground">{t.home.ambiguousHint}</p>
              <div className="mt-4 flex gap-3">
                <Button onClick={() => void analyze('video')}>{t.home.chooseVideo}</Button>
                <Button variant="secondary" onClick={() => void analyze('playlist')}>
                  {t.home.choosePlaylist}
                </Button>
              </div>
            </motion.div>
          )}

          {!analyzing && analyzeError && (
            <ErrorPanel
              error={analyzeError}
              onRetry={() => void analyze(ambiguousSource ? 'video' : 'auto')}
            />
          )}

          {!analyzing && media?.kind === 'video' && <VideoPreview video={media} />}
          {!analyzing && media?.kind === 'playlist' && <PlaylistPreview playlist={media} />}

          {!analyzing && !media && !analyzeError && !ambiguousSource && (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-card/30 text-center"
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Search className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-medium">{t.home.emptyTitle}</h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">{t.home.emptyBody}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
