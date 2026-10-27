import { useState } from 'react'
import {
  Captions,
  Download,
  FileAudio,
  FileJson,
  FileText,
  Image as ImageIcon,
  ListVideo
} from 'lucide-react'
import { motion } from 'motion/react'
import type { VideoMetadata } from '@shared/domain/types'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n'
import { formatDuration } from '@/lib/utils'
import { ActionDialog } from '@/components/media/ActionDialog'

export function VideoPreview({ video }: { video: VideoMetadata }): React.JSX.Element {
  const { t } = useI18n()
  const [action, setAction] = useState<
    'video' | 'audio' | 'transcript' | 'thumbnail' | 'metadata' | 'description' | 'chapters' | null
  >(null)

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="overflow-hidden rounded-xl border border-border bg-card/50">
          {video.thumbnailUrl ? (
            <img
              src={video.thumbnailUrl}
              alt=""
              className="aspect-video w-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex aspect-video items-center justify-center bg-secondary text-muted-foreground">
              No thumbnail
            </div>
          )}
        </div>
        <div className="min-w-0">
          <h2 className="text-xl font-semibold leading-snug tracking-tight">{video.title}</h2>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {video.channel && (
              <span>
                {t.preview.channel}: <span className="text-foreground">{video.channel}</span>
              </span>
            )}
            <span>
              {t.preview.duration}:{' '}
              <span className="text-foreground">{formatDuration(video.durationSec)}</span>
            </span>
            {video.viewCount !== undefined && (
              <span>
                {t.preview.views}:{' '}
                <span className="text-foreground">{video.viewCount.toLocaleString()}</span>
              </span>
            )}
            {video.uploadDate && (
              <span>
                {t.preview.uploaded}: <span className="text-foreground">{video.uploadDate}</span>
              </span>
            )}
            <span>
              {t.preview.videoId}: <span className="font-mono text-foreground">{video.id}</span>
            </span>
          </div>
          {video.description && (
            <p className="mt-4 line-clamp-3 text-sm text-muted-foreground">{video.description}</p>
          )}
        </div>
      </div>

      <section>
        <h3 className="mb-2 text-sm font-medium text-muted-foreground">{t.preview.resolutions}</h3>
        <div className="flex flex-wrap gap-2">
          {video.resolutions.length === 0 && (
            <span className="text-sm text-muted-foreground">—</span>
          )}
          {video.resolutions.map((r) => (
            <span
              key={r.height}
              className="rounded-md border border-border bg-secondary/50 px-2.5 py-1 text-xs font-medium"
            >
              {r.label}
            </span>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-medium text-muted-foreground">{t.preview.captions}</h3>
        {video.subtitles.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.preview.noCaptions}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {video.subtitles.map((s) => (
              <span
                key={`${s.language}-${s.origin}`}
                className="rounded-md border border-border bg-secondary/40 px-2.5 py-1 text-xs"
              >
                {s.language} · {s.origin === 'manual' ? t.preview.manual : t.preview.automatic}
              </span>
            ))}
          </div>
        )}
      </section>

      {video.chapters.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">{t.preview.chapters}</h3>
          <ul className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border bg-card/40 p-3 text-sm scrollbar-thin">
            {video.chapters.map((c, i) => (
              <li key={`${c.startMs}-${i}`} className="flex gap-3 text-muted-foreground">
                <span className="w-14 shrink-0 font-mono text-xs text-foreground">
                  {formatDuration(c.startMs / 1000)}
                </span>
                <span>{c.title}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">{t.preview.actions}</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <ActionCard
            icon={<Download className="h-4 w-4" />}
            label={t.preview.downloadVideo}
            onClick={() => setAction('video')}
          />
          <ActionCard
            icon={<FileAudio className="h-4 w-4" />}
            label={t.preview.downloadAudio}
            onClick={() => setAction('audio')}
          />
          <ActionCard
            icon={<Captions className="h-4 w-4" />}
            label={t.preview.downloadTranscript}
            onClick={() => setAction('transcript')}
            disabled={video.subtitles.length === 0}
          />
          <ActionCard
            icon={<ImageIcon className="h-4 w-4" />}
            label={t.preview.downloadThumbnail}
            onClick={() => setAction('thumbnail')}
          />
          <ActionCard
            icon={<FileJson className="h-4 w-4" />}
            label={t.preview.exportMetadata}
            onClick={() => setAction('metadata')}
          />
          <ActionCard
            icon={<FileText className="h-4 w-4" />}
            label={t.preview.exportDescription}
            onClick={() => setAction('description')}
            disabled={!video.description}
          />
          {video.chapters.length > 0 && (
            <ActionCard
              icon={<ListVideo className="h-4 w-4" />}
              label={t.preview.exportChapters}
              onClick={() => setAction('chapters')}
            />
          )}
        </div>
      </section>

      {action && (
        <ActionDialog
          action={action}
          video={video}
          open={!!action}
          onOpenChange={(open) => {
            if (!open) setAction(null)
          }}
        />
      )}
    </motion.div>
  )
}

function ActionCard({
  icon,
  label,
  onClick,
  disabled
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
}): React.JSX.Element {
  return (
    <Button
      variant="outline"
      className="h-auto justify-start gap-3 px-4 py-3"
      onClick={onClick}
      disabled={disabled}
    >
      <span className="text-primary">{icon}</span>
      <span>{label}</span>
    </Button>
  )
}
