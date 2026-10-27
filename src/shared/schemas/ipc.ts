import { z } from 'zod'

export const analyzeIntentSchema = z.enum(['auto', 'video', 'playlist'])

export const analyzeUrlRequestSchema = z.object({
  url: z.string().min(1).max(2048),
  intent: analyzeIntentSchema.default('auto')
})

export type AnalyzeUrlRequest = z.infer<typeof analyzeUrlRequestSchema>

export const qualityModeSchema = z.enum(['best', 'best_up_to', 'exact'])
export const videoContainerSchema = z.enum(['mp4', 'mkv', 'auto'])
export const audioFormatSchema = z.enum(['mp3', 'm4a', 'opus'])
export const audioQualitySchema = z.enum(['vbr_high', '192k', '128k'])
export const transcriptFormatSchema = z.enum(['vtt', 'srt', 'txt', 'txt_timestamps', 'json'])
export const existingFilePolicySchema = z.enum(['rename', 'overwrite', 'skip'])

export const videoDownloadOptionsSchema = z.object({
  qualityMode: qualityModeSchema,
  height: z.number().int().positive().optional(),
  container: videoContainerSchema,
  embedMetadata: z.boolean().default(true),
  outputDirectory: z.string().min(1)
})

export const audioDownloadOptionsSchema = z.object({
  format: audioFormatSchema,
  quality: audioQualitySchema,
  outputDirectory: z.string().min(1)
})

export const transcriptDownloadOptionsSchema = z.object({
  language: z.string().min(1),
  preferManual: z.boolean().default(true),
  format: transcriptFormatSchema,
  outputDirectory: z.string().min(1)
})

export const simpleExportOptionsSchema = z.object({
  outputDirectory: z.string().min(1),
  includeRaw: z.boolean().optional()
})

export const playlistDownloadOptionsSchema = z.object({
  entryIds: z.array(z.string()).min(1),
  qualityMode: qualityModeSchema,
  height: z.number().int().positive().optional(),
  container: videoContainerSchema,
  outputDirectory: z.string().min(1)
})

const youtubeUrlSchema = z.string().min(1).max(2048)

export const enqueueDownloadRequestSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('video'),
    url: youtubeUrlSchema,
    videoId: z.string(),
    title: z.string(),
    options: videoDownloadOptionsSchema
  }),
  z.object({
    action: z.literal('audio'),
    url: youtubeUrlSchema,
    videoId: z.string(),
    title: z.string(),
    options: audioDownloadOptionsSchema
  }),
  z.object({
    action: z.literal('transcript'),
    url: youtubeUrlSchema,
    videoId: z.string(),
    title: z.string(),
    options: transcriptDownloadOptionsSchema
  }),
  z.object({
    action: z.literal('thumbnail'),
    url: youtubeUrlSchema,
    videoId: z.string(),
    title: z.string(),
    options: simpleExportOptionsSchema
  }),
  z.object({
    action: z.literal('metadata'),
    url: youtubeUrlSchema,
    videoId: z.string(),
    title: z.string(),
    options: simpleExportOptionsSchema
  }),
  z.object({
    action: z.literal('description'),
    url: youtubeUrlSchema,
    videoId: z.string(),
    title: z.string(),
    options: simpleExportOptionsSchema
  }),
  z.object({
    action: z.literal('chapters'),
    url: youtubeUrlSchema,
    videoId: z.string(),
    title: z.string(),
    options: simpleExportOptionsSchema
  }),
  z.object({
    action: z.literal('playlist'),
    url: youtubeUrlSchema,
    playlistId: z.string(),
    title: z.string(),
    options: playlistDownloadOptionsSchema
  })
])

export type EnqueueDownloadRequest = z.infer<typeof enqueueDownloadRequestSchema>

export const jobIdSchema = z.object({
  jobId: z.string().min(1)
})

export const openPathSchema = z.object({
  path: z.string().min(1)
})

export const settingsPatchSchema = z
  .object({
    downloadDirectory: z.string().min(1).optional(),
    locale: z.enum(['pl', 'en']).optional(),
    theme: z.enum(['system', 'dark', 'light']).optional(),
    openFolderOnComplete: z.boolean().optional(),
    preferredVideoQuality: z.union([z.number().int().positive(), z.literal('best')]).optional(),
    qualityMode: qualityModeSchema.optional(),
    preferredContainer: videoContainerSchema.optional(),
    preferredAudioFormat: audioFormatSchema.optional(),
    preferredAudioQuality: audioQualitySchema.optional(),
    preferredTranscriptLanguage: z.string().optional(),
    existingFilePolicy: existingFilePolicySchema.optional(),
    maxConcurrentDownloads: z.number().int().min(1).max(3).optional(),
    maxRetries: z.number().int().min(0).max(5).optional(),
    toolOverrides: z
      .object({
        ytDlp: z.string().optional(),
        ffmpeg: z.string().optional(),
        ffprobe: z.string().optional(),
        deno: z.string().optional()
      })
      .optional()
  })
  .strict()

export const openExternalSchema = z.object({
  url: z.string().url()
})
