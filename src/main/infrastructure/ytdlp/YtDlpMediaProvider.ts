import { unlink } from 'fs/promises'
import { mkdir, readFile, readdir, rename, rm, writeFile } from 'fs/promises'
import path from 'path'
import { buildAudioEmbedArgs, probeAudioTags } from '../ffmpeg/probeAudioTags'
import type {
  DownloadProgress,
  Transcript,
  VideoMetadata,
  PlaylistMetadata
} from '../../../shared/domain/types'
import { AppError } from '../../../shared/errors/AppError'
import { ErrorCode } from '../../../shared/errors/codes'
import { audioQualityToYtDlp, selectFormatSelector } from '../../../shared/domain/formats'
import {
  buildPlaylistItemFilename,
  sanitizeDirectoryName,
  sanitizeFilename
} from '../../../shared/domain/filenames'
import type { EnqueueDownloadRequest } from '../../../shared/schemas/ipc'
import type { IProcessRunner } from '../processes/ProcessRunner'
import type { ToolPathResolver } from '../tools/ToolPathResolver'
import { ensureWritableDirectory, resolveSafeOutputPath } from '../filesystem/paths'
import { mapPlaylistMetadata, mapVideoMetadata } from './metadataMapper'
import { mapYtDlpError } from './errorMapper'
import {
  createLineSplitter,
  DOWNLOAD_PROGRESS_TEMPLATE,
  parseProgressLine,
  POSTPROCESS_PROGRESS_TEMPLATE
} from './progressParser'
import type { DownloadExecutionOptions, IMediaProvider } from './IMediaProvider'
import {
  parseVttToSegments,
  parseSrtToSegments,
  segmentsToTxt,
  segmentsToSrt,
  segmentsToVtt
} from '../transcript/transcriptParser'
import type { Logger } from '../persistence/Logger'

export class YtDlpMediaProvider implements IMediaProvider {
  constructor(
    private readonly runner: IProcessRunner,
    private readonly tools: ToolPathResolver,
    private readonly logger: Logger
  ) {}

  private async requireTools(): Promise<{ ytDlp: string; ffmpegDir: string; deno: string }> {
    const ytDlp = this.tools.resolve('ytDlp')
    const ffmpeg = this.tools.resolve('ffmpeg')
    const deno = this.tools.resolve('deno')
    if (!(await this.tools.exists(ytDlp))) {
      throw new AppError(ErrorCode.MISSING_YTDLP, 'yt-dlp is not installed', { retryable: false })
    }
    if (!(await this.tools.exists(ffmpeg))) {
      throw new AppError(ErrorCode.MISSING_FFMPEG, 'FFmpeg is not installed', { retryable: false })
    }
    if (!(await this.tools.exists(deno))) {
      throw new AppError(ErrorCode.MISSING_DENO, 'Deno is not installed', { retryable: false })
    }
    return { ytDlp, ffmpegDir: path.dirname(ffmpeg), deno }
  }

  private baseArgs(deno: string, ffmpegDir: string): string[] {
    return [
      '--no-playlist',
      '--ffmpeg-location',
      ffmpegDir,
      '--js-runtimes',
      `deno:${deno}`,
      '--no-mtime',
      '--encoding',
      'utf8'
    ]
  }

  async analyzeVideo(url: string, options?: { signal?: AbortSignal }): Promise<VideoMetadata> {
    const { ytDlp, ffmpegDir, deno } = await this.requireTools()
    const args = [
      ...this.baseArgs(deno, ffmpegDir),
      '--dump-single-json',
      '--no-download',
      '--no-playlist',
      '--',
      url
    ]
    const result = await this.runner.run(ytDlp, args, {
      signal: options?.signal,
      timeoutMs: 120_000
    })
    if (result.canceled) {
      throw new AppError(ErrorCode.CANCELED, 'Analysis canceled', { retryable: true })
    }
    if (result.exitCode !== 0) {
      throw mapYtDlpError(result.stderr, result.stdout)
    }
    const raw = JSON.parse(result.stdout) as Record<string, unknown>
    return mapVideoMetadata(raw, url)
  }

  async analyzePlaylist(
    url: string,
    options?: { signal?: AbortSignal }
  ): Promise<PlaylistMetadata> {
    const { ytDlp, ffmpegDir, deno } = await this.requireTools()
    const args = [
      '--ffmpeg-location',
      ffmpegDir,
      '--js-runtimes',
      `deno:${deno}`,
      '--dump-single-json',
      '--flat-playlist',
      '--yes-playlist',
      '--no-download',
      '--',
      url
    ]
    const result = await this.runner.run(ytDlp, args, {
      signal: options?.signal,
      timeoutMs: 180_000,
      maxBufferBytes: 32 * 1024 * 1024
    })
    if (result.canceled) {
      throw new AppError(ErrorCode.CANCELED, 'Analysis canceled', { retryable: true })
    }
    if (result.exitCode !== 0) {
      throw mapYtDlpError(result.stderr, result.stdout)
    }
    const raw = JSON.parse(result.stdout) as Record<string, unknown>
    return mapPlaylistMetadata(raw, url)
  }

  async download(options: DownloadExecutionOptions): Promise<string[]> {
    const { request, jobId, signal, onProgress } = options
    switch (request.action) {
      case 'video':
        return this.downloadVideo(request, jobId, signal, onProgress)
      case 'audio':
        return this.downloadAudio(request, jobId, signal, onProgress)
      case 'transcript':
        return this.downloadTranscript(request, jobId, signal, onProgress)
      case 'thumbnail':
        return this.downloadThumbnail(request, jobId, signal, onProgress)
      case 'metadata':
        return this.exportMetadata(request, jobId, signal, onProgress)
      case 'description':
        return this.exportDescription(request, jobId, signal, onProgress)
      case 'chapters':
        return this.exportChapters(request, jobId, signal, onProgress)
      case 'playlist':
        return this.downloadPlaylist(request, jobId, signal, onProgress)
      default:
        throw new AppError(ErrorCode.VALIDATION_FAILED, 'Unknown download action')
    }
  }

  private emitProgress(
    onProgress: ((p: DownloadProgress) => void) | undefined,
    progress: DownloadProgress
  ): void {
    onProgress?.(progress)
  }

  private attachProgressHandlers(
    jobId: string,
    onProgress?: (p: DownloadProgress) => void
  ): { onStdout: (chunk: string) => void; onStderr: (chunk: string) => void } {
    const handleLine = (line: string): void => {
      const p = parseProgressLine(jobId, line)
      if (p) this.emitProgress(onProgress, p)
    }
    const splitOut = createLineSplitter(handleLine)
    const splitErr = createLineSplitter(handleLine)
    return { onStdout: splitOut, onStderr: splitErr }
  }

  private async downloadVideo(
    request: Extract<EnqueueDownloadRequest, { action: 'video' }>,
    jobId: string,
    signal?: AbortSignal,
    onProgress?: (p: DownloadProgress) => void
  ): Promise<string[]> {
    const { ytDlp, ffmpegDir, deno } = await this.requireTools()
    const { options } = request
    await ensureWritableDirectory(options.outputDirectory)

    const format = selectFormatSelector(options.qualityMode, options.height, options.container)
    const outTemplate = path.join(
      options.outputDirectory,
      `${sanitizeFilename(request.title)} [${request.videoId}].%(ext)s`
    )

    const mergeArgs =
      options.container === 'mp4'
        ? ['--merge-output-format', 'mp4']
        : options.container === 'mkv'
          ? ['--merge-output-format', 'mkv']
          : []

    const args = [
      '--ffmpeg-location',
      ffmpegDir,
      '--js-runtimes',
      `deno:${deno}`,
      '--no-playlist',
      '-f',
      format,
      ...mergeArgs,
      ...(options.embedMetadata ? ['--embed-metadata', '--embed-chapters'] : []),
      '--newline',
      '--progress',
      '--progress-template',
      DOWNLOAD_PROGRESS_TEMPLATE,
      '--progress-template',
      POSTPROCESS_PROGRESS_TEMPLATE,
      '-o',
      outTemplate,
      '--',
      request.url
    ]

    this.emitProgress(onProgress, { jobId, state: 'downloading', stage: 'download', percent: 0 })

    const result = await this.runner.run(ytDlp, args, {
      signal,
      timeoutMs: 0,
      ...this.attachProgressHandlers(jobId, onProgress)
    })

    if (result.canceled)
      throw new AppError(ErrorCode.CANCELED, 'Download canceled', { retryable: true })
    if (result.timedOut)
      throw new AppError(ErrorCode.PROCESS_INTERRUPTED, 'Download timed out', { retryable: true })
    if (result.exitCode !== 0) throw mapYtDlpError(result.stderr, result.stdout)

    const outputs = await this.findOutputs(options.outputDirectory, request.videoId)
    if (outputs.length === 0) {
      throw new AppError(ErrorCode.INVALID_OUTPUT, 'Output file was not created', {
        retryable: true
      })
    }
    this.emitProgress(onProgress, {
      jobId,
      state: 'completed',
      stage: 'finalize',
      percent: 100,
      filename: outputs[0]
    })
    return outputs
  }

  private async downloadAudio(
    request: Extract<EnqueueDownloadRequest, { action: 'audio' }>,
    jobId: string,
    signal?: AbortSignal,
    onProgress?: (p: DownloadProgress) => void
  ): Promise<string[]> {
    const { ytDlp, ffmpegDir, deno } = await this.requireTools()
    await ensureWritableDirectory(request.options.outputDirectory)
    const outTemplate = path.join(
      request.options.outputDirectory,
      `${sanitizeFilename(request.title)} [${request.videoId}].%(ext)s`
    )

    const embedThumbnail = request.options.embedThumbnail !== false
    const embedMetadata = request.options.embedMetadata !== false

    const args = [
      '--ffmpeg-location',
      ffmpegDir,
      '--js-runtimes',
      `deno:${deno}`,
      '--no-playlist',
      '-x',
      '--audio-format',
      request.options.format,
      '--audio-quality',
      audioQualityToYtDlp(request.options.quality),
      ...buildAudioEmbedArgs({
        format: request.options.format,
        embedThumbnail,
        embedMetadata,
        albumTitle: request.options.albumTitle
      }),
      '--newline',
      '--progress',
      '--progress-template',
      DOWNLOAD_PROGRESS_TEMPLATE,
      '--progress-template',
      POSTPROCESS_PROGRESS_TEMPLATE,
      '-o',
      outTemplate,
      '--',
      request.url
    ]

    this.emitProgress(onProgress, { jobId, state: 'downloading', stage: 'download', percent: 0 })
    const result = await this.runner.run(ytDlp, args, {
      signal,
      ...this.attachProgressHandlers(jobId, onProgress)
    })

    if (result.canceled)
      throw new AppError(ErrorCode.CANCELED, 'Download canceled', { retryable: true })
    if (result.exitCode !== 0) throw mapYtDlpError(result.stderr, result.stdout)

    this.emitProgress(onProgress, {
      jobId,
      state: 'processing',
      stage: 'postprocess',
      percent: 95,
      message: 'Verifying audio tags'
    })

    const outputs = await this.findOutputs(request.options.outputDirectory, request.videoId, [
      request.options.format
    ])
    if (outputs.length === 0) {
      throw new AppError(ErrorCode.INVALID_OUTPUT, 'Audio file was not created', {
        retryable: true
      })
    }

    await this.cleanupSidecarThumbnails(request.options.outputDirectory, request.videoId)

    const audioPath = outputs[0]!
    const ffprobe = this.tools.resolve('ffprobe')
    if (await this.tools.exists(ffprobe)) {
      const probe = await probeAudioTags(this.runner, ffprobe, audioPath, signal)
      if (embedThumbnail && !probe.hasAttachedPicture) {
        this.logger.warn('Audio cover art was requested but not found in output', {
          jobId,
          audioPath
        })
        this.emitProgress(onProgress, {
          jobId,
          state: 'processing',
          stage: 'postprocess',
          percent: 98,
          message: 'Warning: cover art was not embedded'
        })
      }
      if (embedMetadata && !probe.title) {
        this.logger.warn('Audio metadata was requested but title tag is missing', {
          jobId,
          audioPath
        })
      }
    }

    this.emitProgress(onProgress, {
      jobId,
      state: 'completed',
      stage: 'finalize',
      percent: 100,
      filename: audioPath
    })
    return outputs
  }

  /** Remove leftover thumbnail sidecars after successful embed (do not keep loose JPGs). */
  private async cleanupSidecarThumbnails(directory: string, videoId: string): Promise<void> {
    try {
      const files = await readdir(directory)
      const sidecars = files.filter(
        (f) =>
          f.includes(`[${videoId}]`) &&
          /\.(jpe?g|png|webp)$/i.test(f) &&
          !/\.(mp3|m4a|opus|webm|mp4|mkv)$/i.test(f)
      )
      for (const file of sidecars) {
        await unlink(path.join(directory, file)).catch(() => undefined)
      }
    } catch {
      // nonfatal
    }
  }

  private async downloadTranscript(
    request: Extract<EnqueueDownloadRequest, { action: 'transcript' }>,
    jobId: string,
    signal?: AbortSignal,
    onProgress?: (p: DownloadProgress) => void
  ): Promise<string[]> {
    this.emitProgress(onProgress, { jobId, state: 'downloading', stage: 'download', percent: 10 })
    const transcript = await this.fetchTranscript(
      request.url,
      request.options.language,
      request.options.preferManual,
      signal
    )
    await ensureWritableDirectory(request.options.outputDirectory)
    const base = `${sanitizeFilename(request.title)} [${request.videoId}].${request.options.language}`
    let content = ''
    let ext = 'txt'
    switch (request.options.format) {
      case 'json':
        content = JSON.stringify(transcript, null, 2)
        ext = 'json'
        break
      case 'srt':
        content = segmentsToSrt(transcript.segments)
        ext = 'srt'
        break
      case 'vtt':
        content = segmentsToVtt(transcript.segments)
        ext = 'vtt'
        break
      case 'txt_timestamps':
        content = segmentsToTxt(transcript.segments, true)
        ext = 'txt'
        break
      default:
        content = segmentsToTxt(transcript.segments, false)
        ext = 'txt'
    }
    const outPath = resolveSafeOutputPath(request.options.outputDirectory, `${base}.${ext}`)
    await writeFile(outPath, content, 'utf8')
    this.emitProgress(onProgress, {
      jobId,
      state: 'completed',
      stage: 'finalize',
      percent: 100,
      filename: outPath
    })
    return [outPath]
  }

  async fetchTranscript(
    url: string,
    language: string,
    preferManual: boolean,
    signal?: AbortSignal
  ): Promise<Transcript> {
    const { ytDlp, ffmpegDir, deno } = await this.requireTools()
    const tmpDir = path.join(this.tools.getVendorBinDir(), '..', '.tmp', `subs-${Date.now()}`)
    await mkdir(tmpDir, { recursive: true })
    try {
      const args = [
        '--ffmpeg-location',
        ffmpegDir,
        '--js-runtimes',
        `deno:${deno}`,
        '--no-playlist',
        '--skip-download',
        '--write-subs',
        '--write-auto-subs',
        '--sub-langs',
        language,
        '--sub-format',
        'vtt/srt/best',
        '-o',
        path.join(tmpDir, '%(id)s.%(ext)s'),
        '--',
        url
      ]
      const result = await this.runner.run(ytDlp, args, { signal, timeoutMs: 120_000 })
      if (result.canceled) throw new AppError(ErrorCode.CANCELED, 'Canceled', { retryable: true })
      if (result.exitCode !== 0) throw mapYtDlpError(result.stderr, result.stdout)

      const files = await readdir(tmpDir)
      const subFiles = files.filter((f) => f.endsWith('.vtt') || f.endsWith('.srt'))
      if (subFiles.length === 0) {
        throw new AppError(ErrorCode.MISSING_CAPTIONS, 'No captions available for this video', {
          retryable: false
        })
      }

      // Prefer manual (no .auto. or language without auto) when preferManual
      const sorted = [...subFiles].sort((a, b) => {
        const aAuto = a.includes('.auto.') || a.includes('-auto') ? 1 : 0
        const bAuto = b.includes('.auto.') || b.includes('-auto') ? 1 : 0
        return preferManual ? aAuto - bAuto : bAuto - aAuto
      })
      const chosen = sorted[0]!
      const content = await readFile(path.join(tmpDir, chosen), 'utf8')
      const segments = chosen.endsWith('.srt')
        ? parseSrtToSegments(content)
        : parseVttToSegments(content)
      if (segments.length === 0) {
        throw new AppError(ErrorCode.MISSING_CAPTIONS, 'Caption file was empty', {
          retryable: false
        })
      }

      const videoIdMatch = chosen.match(/^([A-Za-z0-9_-]{11})/)
      const origin: 'manual' | 'automatic' =
        chosen.includes('.auto.') || chosen.includes('-auto') ? 'automatic' : 'manual'

      return {
        videoId: videoIdMatch?.[1] ?? 'unknown',
        url,
        language,
        origin,
        segments
      }
    } finally {
      await rm(tmpDir, { recursive: true, force: true }).catch(() => undefined)
    }
  }

  private async downloadThumbnail(
    request: Extract<EnqueueDownloadRequest, { action: 'thumbnail' }>,
    jobId: string,
    signal?: AbortSignal,
    onProgress?: (p: DownloadProgress) => void
  ): Promise<string[]> {
    const { ytDlp, ffmpegDir, deno } = await this.requireTools()
    await ensureWritableDirectory(request.options.outputDirectory)
    const outTemplate = path.join(
      request.options.outputDirectory,
      `${sanitizeFilename(request.title)} [${request.videoId}].%(ext)s`
    )
    const args = [
      '--ffmpeg-location',
      ffmpegDir,
      '--js-runtimes',
      `deno:${deno}`,
      '--no-playlist',
      '--skip-download',
      '--write-thumbnail',
      '--convert-thumbnails',
      'jpg',
      '-o',
      outTemplate,
      '--',
      request.url
    ]
    this.emitProgress(onProgress, { jobId, state: 'downloading', stage: 'download', percent: 0 })
    const result = await this.runner.run(ytDlp, args, { signal })
    if (result.canceled) throw new AppError(ErrorCode.CANCELED, 'Canceled', { retryable: true })
    if (result.exitCode !== 0) throw mapYtDlpError(result.stderr, result.stdout)
    const outputs = await this.findOutputs(request.options.outputDirectory, request.videoId, [
      'jpg',
      'webp',
      'png'
    ])
    if (!outputs.length) {
      throw new AppError(ErrorCode.INVALID_OUTPUT, 'Thumbnail was not created', { retryable: true })
    }
    return outputs
  }

  private async exportMetadata(
    request: Extract<EnqueueDownloadRequest, { action: 'metadata' }>,
    jobId: string,
    signal?: AbortSignal,
    onProgress?: (p: DownloadProgress) => void
  ): Promise<string[]> {
    this.emitProgress(onProgress, { jobId, state: 'analyzing', stage: 'download', percent: 10 })
    const meta = await this.analyzeVideo(request.url, { signal })
    await ensureWritableDirectory(request.options.outputDirectory)
    const curated = {
      id: meta.id,
      url: meta.url,
      title: meta.title,
      channel: meta.channel,
      durationSec: meta.durationSec,
      uploadDate: meta.uploadDate,
      viewCount: meta.viewCount,
      description: meta.description,
      resolutions: meta.resolutions.map((r) => r.height),
      subtitles: meta.subtitles,
      chapters: meta.chapters
    }
    const outPath = resolveSafeOutputPath(
      request.options.outputDirectory,
      `${sanitizeFilename(request.title)} [${request.videoId}].metadata.json`
    )
    await writeFile(outPath, JSON.stringify(curated, null, 2), 'utf8')

    if (request.options.includeRaw) {
      const { ytDlp, ffmpegDir, deno } = await this.requireTools()
      const result = await this.runner.run(
        ytDlp,
        [
          ...this.baseArgs(deno, ffmpegDir),
          '--dump-single-json',
          '--no-download',
          '--',
          request.url
        ],
        { signal }
      )
      if (result.exitCode === 0) {
        const rawPath = resolveSafeOutputPath(
          request.options.outputDirectory,
          `${sanitizeFilename(request.title)} [${request.videoId}].raw.json`
        )
        await writeFile(rawPath, result.stdout, 'utf8')
        return [outPath, rawPath]
      }
    }
    return [outPath]
  }

  private async exportDescription(
    request: Extract<EnqueueDownloadRequest, { action: 'description' }>,
    jobId: string,
    signal?: AbortSignal,
    onProgress?: (p: DownloadProgress) => void
  ): Promise<string[]> {
    this.emitProgress(onProgress, { jobId, state: 'analyzing', stage: 'download', percent: 10 })
    const meta = await this.analyzeVideo(request.url, { signal })
    if (!meta.description) {
      throw new AppError(ErrorCode.INVALID_OUTPUT, 'No description available', { retryable: false })
    }
    await ensureWritableDirectory(request.options.outputDirectory)
    const outPath = resolveSafeOutputPath(
      request.options.outputDirectory,
      `${sanitizeFilename(request.title)} [${request.videoId}].description.txt`
    )
    await writeFile(outPath, meta.description, 'utf8')
    return [outPath]
  }

  private async exportChapters(
    request: Extract<EnqueueDownloadRequest, { action: 'chapters' }>,
    jobId: string,
    signal?: AbortSignal,
    onProgress?: (p: DownloadProgress) => void
  ): Promise<string[]> {
    this.emitProgress(onProgress, { jobId, state: 'analyzing', stage: 'download', percent: 10 })
    const meta = await this.analyzeVideo(request.url, { signal })
    if (!meta.chapters.length) {
      throw new AppError(ErrorCode.INVALID_OUTPUT, 'No chapters available', { retryable: false })
    }
    await ensureWritableDirectory(request.options.outputDirectory)
    const jsonPath = resolveSafeOutputPath(
      request.options.outputDirectory,
      `${sanitizeFilename(request.title)} [${request.videoId}].chapters.json`
    )
    await writeFile(jsonPath, JSON.stringify(meta.chapters, null, 2), 'utf8')
    const txtPath = resolveSafeOutputPath(
      request.options.outputDirectory,
      `${sanitizeFilename(request.title)} [${request.videoId}].chapters.txt`
    )
    const txt = meta.chapters.map((c) => `${formatTs(c.startMs)}  ${c.title}`).join('\n')
    await writeFile(txtPath, txt, 'utf8')
    return [jsonPath, txtPath]
  }

  private async downloadPlaylist(
    request: Extract<EnqueueDownloadRequest, { action: 'playlist' }>,
    jobId: string,
    signal?: AbortSignal,
    onProgress?: (p: DownloadProgress) => void
  ): Promise<string[]> {
    const playlist = await this.analyzePlaylist(request.url, { signal })
    const folder = path.join(
      request.options.outputDirectory,
      sanitizeDirectoryName(request.title || playlist.title)
    )
    await ensureWritableDirectory(folder)

    const selected = playlist.entries.filter(
      (e) => request.options.entryIds.includes(e.id) && !e.unavailable
    )
    const outputs: string[] = []
    let completed = 0

    for (const entry of selected) {
      if (signal?.aborted) {
        throw new AppError(ErrorCode.CANCELED, 'Playlist download canceled', { retryable: true })
      }
      this.emitProgress(onProgress, {
        jobId,
        state: 'downloading',
        stage: 'download',
        currentItem: completed + 1,
        totalItems: selected.length,
        message: entry.title,
        percent: Math.round((completed / selected.length) * 100)
      })

      try {
        const itemOutputs = request.options.asAudio
          ? await this.downloadAudio(
              {
                action: 'audio',
                url: entry.url,
                videoId: entry.id,
                title: entry.title,
                options: {
                  format: request.options.audioFormat ?? 'mp3',
                  quality: request.options.audioQuality ?? 'vbr_high',
                  outputDirectory: folder,
                  embedThumbnail: request.options.embedThumbnail !== false,
                  embedMetadata: request.options.embedMetadata !== false,
                  albumTitle: request.title || playlist.title
                }
              },
              jobId,
              signal,
              onProgress
            )
          : await this.downloadVideo(
              {
                action: 'video',
                url: entry.url,
                videoId: entry.id,
                title: entry.title,
                options: {
                  qualityMode: request.options.qualityMode,
                  height: request.options.height,
                  container: request.options.container,
                  embedMetadata: true,
                  outputDirectory: folder
                }
              },
              jobId,
              signal,
              onProgress
            )
        // Rename to indexed filename
        for (const out of itemOutputs) {
          const ext = path.extname(out).slice(1)
          const indexed = buildPlaylistItemFilename(entry.index, entry.title, entry.id, ext)
          const dest = path.join(folder, indexed)
          if (path.resolve(out) !== path.resolve(dest)) {
            await rename(out, dest).catch(async () => {
              // if target exists, keep original
            })
            outputs.push(existsSyncSafe(dest) ? dest : out)
          } else {
            outputs.push(out)
          }
        }
      } catch (error) {
        this.logger.warn('Playlist item failed', {
          entryId: entry.id,
          error: error instanceof Error ? error.message : String(error)
        })
        // Continue other items
      }
      completed += 1
    }

    if (outputs.length === 0) {
      throw new AppError(ErrorCode.DOWNLOAD_FAILED, 'No playlist items were downloaded', {
        retryable: true
      })
    }
    return outputs
  }

  private async findOutputs(
    directory: string,
    videoId: string,
    exts?: string[]
  ): Promise<string[]> {
    const files = await readdir(directory)
    return files
      .filter((f) => f.includes(`[${videoId}]`))
      .filter((f) => !f.endsWith('.part') && !f.endsWith('.ytdl'))
      .filter((f) => (exts ? exts.some((e) => f.toLowerCase().endsWith(`.${e}`)) : true))
      .map((f) => path.join(directory, f))
  }
}

function existsSyncSafe(p: string): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('fs').existsSync(p)
  } catch {
    return false
  }
}

function formatTs(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}
