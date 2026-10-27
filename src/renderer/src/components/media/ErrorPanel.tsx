import { AlertTriangle } from 'lucide-react'
import type { AppErrorDto } from '@shared/domain/types'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n'

export function ErrorPanel({
  error,
  onRetry
}: {
  error: AppErrorDto
  onRetry?: () => void
}): React.JSX.Element {
  const { t } = useI18n()
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-5 animate-fade-in">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-destructive-foreground/90">{error.message}</p>
          <p className="mt-1 text-xs text-muted-foreground">{error.code}</p>
          {error.technicalDetail && (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs text-muted-foreground">
                {t.errors.technicalDetails}
              </summary>
              <pre className="mt-2 max-h-40 overflow-auto rounded-md bg-background/50 p-3 text-[11px] text-muted-foreground whitespace-pre-wrap">
                {error.technicalDetail}
              </pre>
            </details>
          )}
          {error.retryable && onRetry && (
            <Button className="mt-4" size="sm" variant="secondary" onClick={onRetry}>
              {t.errors.retry}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
