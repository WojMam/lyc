import { File, FolderOpen, RotateCcw, Trash2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useI18n } from '@/i18n'
import { useAppStore } from '@/stores/appStore'
import { formatBytes, formatEta, formatSpeed } from '@/lib/utils'
import type { JobState } from '@shared/domain/types'

const stateKey: Record<JobState, keyof typeof import('@/i18n/pl').pl.downloads> = {
  queued: 'queued',
  analyzing: 'analyzing',
  downloading: 'downloading',
  processing: 'processing',
  completed: 'completed',
  failed: 'failed',
  canceled: 'canceled',
  interrupted: 'interrupted'
}

export function DownloadsPage(): React.JSX.Element {
  const { t } = useI18n()
  const jobs = useAppStore((s) => s.jobs)
  const progressByJob = useAppStore((s) => s.progressByJob)

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-border/60 px-8 py-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t.downloads.title}</h1>
        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            void window.api.clearCompletedHistory().then(() => useAppStore.getState().refreshJobs())
          }
        >
          {t.downloads.clearCompleted}
        </Button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-8 py-6 scrollbar-thin">
        {jobs.length === 0 ? (
          <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-border text-sm text-muted-foreground">
            {t.downloads.empty}
          </div>
        ) : (
          <ul className="space-y-3">
            {jobs.map((job) => {
              const progress = progressByJob[job.id]
              const percent = progress?.percent ?? (job.state === 'completed' ? 100 : 0)
              return (
                <li
                  key={job.id}
                  className="rounded-xl border border-border bg-card/60 p-4 animate-fade-in"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{job.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {t.downloads[stateKey[job.state]]} · {job.action}
                        {progress?.currentItem && progress.totalItems
                          ? ` · ${progress.currentItem}/${progress.totalItems}`
                          : ''}
                      </div>
                      {job.error && (
                        <p className="mt-2 text-xs text-destructive">{job.error.message}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      {(job.state === 'queued' ||
                        job.state === 'downloading' ||
                        job.state === 'processing' ||
                        job.state === 'analyzing') && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title={t.downloads.cancelJob}
                          onClick={() => void window.api.cancelDownload(job.id)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                      {(job.state === 'failed' ||
                        job.state === 'canceled' ||
                        job.state === 'interrupted') && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title={t.downloads.retry}
                          onClick={() => void window.api.retryDownload(job.id)}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                      {job.outputPaths[0] && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title={t.downloads.openFile}
                          onClick={() => void window.api.openFile(job.outputPaths[0]!)}
                        >
                          <File className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        title={t.downloads.openFolder}
                        onClick={() =>
                          void window.api.openFolder(
                            job.outputPaths[0]
                              ? job.outputPaths[0].replace(/[/\\][^/\\]+$/, '')
                              : job.outputDirectory
                          )
                        }
                      >
                        <FolderOpen className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        title={t.downloads.remove}
                        onClick={() => void window.api.removeDownload(job.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {(job.state === 'downloading' ||
                    job.state === 'processing' ||
                    job.state === 'queued') && (
                    <div className="mt-3 space-y-1.5">
                      <Progress value={Math.min(100, Math.max(0, percent ?? 0))} />
                      <div className="flex justify-between gap-3 text-[11px] text-muted-foreground">
                        <span>
                          {percent !== undefined && percent > 0
                            ? `${percent.toFixed(percent >= 10 ? 0 : 1)}%`
                            : '…'}
                          {' · '}
                          {formatBytes(progress?.downloadedBytes)} /{' '}
                          {formatBytes(progress?.totalBytes)}
                        </span>
                        <span className="shrink-0">
                          {progress?.stage === 'postprocess'
                            ? 'Przetwarzanie…'
                            : [
                                formatSpeed(progress?.speedBytesPerSec),
                                formatEta(progress?.etaSeconds)
                                  ? `ETA ${formatEta(progress?.etaSeconds)}`
                                  : ''
                              ]
                                .filter(Boolean)
                                .join(' · ') || '—'}
                        </span>
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
