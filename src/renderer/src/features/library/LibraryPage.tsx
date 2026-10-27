import { File, FolderOpen, RotateCcw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n'
import { useAppStore } from '@/stores/appStore'

export function LibraryPage(): React.JSX.Element {
  const { t } = useI18n()
  const jobs = useAppStore((s) => s.jobs)
  const history = jobs.filter(
    (j) =>
      j.state === 'completed' ||
      j.state === 'failed' ||
      j.state === 'canceled' ||
      j.state === 'interrupted'
  )

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border/60 px-8 py-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t.library.title}</h1>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-8 py-6 scrollbar-thin">
        {history.length === 0 ? (
          <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-border text-sm text-muted-foreground">
            {t.library.empty}
          </div>
        ) : (
          <ul className="space-y-2">
            {history.map((job) => (
              <li
                key={job.id}
                className="flex items-center justify-between rounded-xl border border-border bg-card/50 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{job.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {job.state} · {new Date(job.updatedAt).toLocaleString()}
                  </div>
                </div>
                <div className="flex gap-1">
                  {(job.state === 'failed' ||
                    job.state === 'interrupted' ||
                    job.state === 'canceled') && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => void window.api.retryDownload(job.id)}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  )}
                  {job.outputPaths[0] && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => void window.api.openFile(job.outputPaths[0]!)}
                    >
                      <File className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => void window.api.openFolder(job.outputDirectory)}
                  >
                    <FolderOpen className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => void window.api.removeDownload(job.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
