export type MediaKind = 'video' | 'playlist'

export type QualityMode = 'best' | 'best_up_to' | 'exact'

export type VideoContainer = 'mp4' | 'mkv' | 'auto'

export type AudioFormat = 'mp3' | 'm4a' | 'opus'

export type AudioQuality = 'vbr_high' | '192k' | '128k'

export type TranscriptExportFormat = 'vtt' | 'srt' | 'txt' | 'txt_timestamps' | 'json'

export type CaptionOrigin = 'manual' | 'automatic'

export type JobState =
  | 'queued'
  | 'analyzing'
  | 'downloading'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'canceled'
  | 'interrupted'

export type DownloadAction =
  | 'video'
  | 'audio'
  | 'transcript'
  | 'thumbnail'
  | 'metadata'
  | 'description'
  | 'chapters'
  | 'playlist'

export type AppLocale = 'pl' | 'en'

export type ThemePreference = 'system' | 'dark' | 'light'

export type ExistingFilePolicy = 'rename' | 'overwrite' | 'skip'

export type ToolStatus = 'available' | 'missing' | 'invalid' | 'outdated'

export interface Chapter {
  title: string
  startMs: number
  endMs?: number
}

export interface TranscriptSegment {
  startMs: number
  endMs: number
  text: string
}

export interface Transcript {
  videoId: string
  url: string
  language: string
  origin: CaptionOrigin
  segments: TranscriptSegment[]
  title?: string
  channel?: string
}

export interface SubtitleTrack {
  language: string
  languageName?: string
  origin: CaptionOrigin
  ext?: string
}

export interface VideoFormatOption {
  formatId: string
  height?: number
  width?: number
  fps?: number
  vcodec?: string
  acodec?: string
  ext: string
  filesize?: number
  tbr?: number
  note?: string
  isVideoOnly: boolean
  isAudioOnly: boolean
}

export interface ResolutionOption {
  height: number
  label: string
  formatIds: string[]
}

export interface VideoMetadata {
  kind: 'video'
  id: string
  url: string
  title: string
  channel?: string
  channelId?: string
  durationSec?: number
  uploadDate?: string
  viewCount?: number
  description?: string
  thumbnailUrl?: string
  resolutions: ResolutionOption[]
  audioFormats: VideoFormatOption[]
  allFormats: VideoFormatOption[]
  subtitles: SubtitleTrack[]
  chapters: Chapter[]
  playlistId?: string
  playlistTitle?: string
}

export interface PlaylistEntry {
  id: string
  title: string
  url: string
  durationSec?: number
  thumbnailUrl?: string
  channel?: string
  index: number
  unavailable: boolean
}

export interface PlaylistMetadata {
  kind: 'playlist'
  id: string
  url: string
  title: string
  channel?: string
  thumbnailUrl?: string
  entryCount: number
  entries: PlaylistEntry[]
}

export type AnalyzedMedia = VideoMetadata | PlaylistMetadata

export interface MediaSource {
  url: string
  kind: MediaKind
  videoId?: string
  playlistId?: string
  ambiguous: boolean
}

export interface DownloadProgress {
  jobId: string
  state: JobState
  stage: 'queued' | 'download' | 'postprocess' | 'finalize'
  percent?: number
  downloadedBytes?: number
  totalBytes?: number
  speedBytesPerSec?: number
  etaSeconds?: number
  filename?: string
  message?: string
  currentItem?: number
  totalItems?: number
}

export interface DownloadResult {
  jobId: string
  outputPaths: string[]
  success: boolean
}

export interface ApplicationSettings {
  downloadDirectory: string
  locale: AppLocale
  theme: ThemePreference
  openFolderOnComplete: boolean
  preferredVideoQuality: number | 'best'
  qualityMode: QualityMode
  preferredContainer: VideoContainer
  preferredAudioFormat: AudioFormat
  preferredAudioQuality: AudioQuality
  preferredTranscriptLanguage: string
  existingFilePolicy: ExistingFilePolicy
  maxConcurrentDownloads: number
  maxRetries: number
  toolOverrides: {
    ytDlp?: string
    ffmpeg?: string
    ffprobe?: string
    deno?: string
  }
}

export interface ToolHealth {
  name: 'yt-dlp' | 'ffmpeg' | 'ffprobe' | 'deno'
  status: ToolStatus
  version?: string
  path?: string
  detail?: string
}

export interface AppErrorDto {
  code: string
  message: string
  technicalDetail?: string
  retryable: boolean
}
