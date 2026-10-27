import type { AnalyzedMedia } from '../../shared/domain/types'
import { AppError } from '../../shared/errors/AppError'
import { ErrorCode } from '../../shared/errors/codes'
import { classifyAnalyzeIntent, validateYouTubeUrl } from '../../shared/domain/youtubeUrl'
import type { IMediaProvider } from '../infrastructure/ytdlp/IMediaProvider'
import type { Logger } from '../infrastructure/persistence/Logger'

export class AnalyzeService {
  private inflight: AbortController | null = null

  constructor(
    private readonly media: IMediaProvider,
    private readonly logger: Logger
  ) {}

  async analyze(
    url: string,
    intent: 'auto' | 'video' | 'playlist' = 'auto'
  ): Promise<AnalyzedMedia> {
    const validated = validateYouTubeUrl(url)
    if (!validated.ok) {
      const messages: Record<string, string> = {
        empty: 'URL is empty',
        invalid: 'URL is invalid',
        unsupported_scheme: 'Only http(s) YouTube URLs are supported',
        unsupported_host: 'Only YouTube URLs are supported',
        credentials: 'URLs with credentials are not allowed'
      }
      throw new AppError(
        validated.reason === 'unsupported_host' ? ErrorCode.UNSUPPORTED_URL : ErrorCode.INVALID_URL,
        messages[validated.reason] ?? 'Invalid URL',
        { retryable: false }
      )
    }

    if (this.inflight) {
      this.inflight.abort()
    }
    const controller = new AbortController()
    this.inflight = controller

    const mode = classifyAnalyzeIntent(validated.source, intent)
    try {
      if (mode === 'playlist') {
        const playlist = await this.media.analyzePlaylist(validated.source.url, {
          signal: controller.signal
        })
        return playlist
      }
      return await this.media.analyzeVideo(validated.source.url, { signal: controller.signal })
    } catch (error) {
      this.logger.error('Analyze failed', {
        url: validated.source.url,
        error: error instanceof Error ? error.message : String(error)
      })
      throw AppError.fromUnknown(error, ErrorCode.ANALYSIS_FAILED)
    } finally {
      if (this.inflight === controller) this.inflight = null
    }
  }
}
