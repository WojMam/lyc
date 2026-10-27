import { AppError } from '../../../shared/errors/AppError'
import { ErrorCode } from '../../../shared/errors/codes'

export function mapYtDlpError(stderr: string, stdout = ''): AppError {
  const text = `${stderr}\n${stdout}`.toLowerCase()

  if (text.includes('sign in') || text.includes('private video') || text.includes('members-only')) {
    return new AppError(ErrorCode.PRIVATE_OR_RESTRICTED, 'This video is private or restricted', {
      technicalDetail: stderr.slice(0, 2000),
      retryable: false
    })
  }
  if (
    text.includes('video unavailable') ||
    text.includes('has been removed') ||
    text.includes('does not exist')
  ) {
    return new AppError(ErrorCode.VIDEO_UNAVAILABLE, 'Video is unavailable', {
      technicalDetail: stderr.slice(0, 2000),
      retryable: false
    })
  }
  if (text.includes('unable to download api page') || text.includes('network is unreachable')) {
    return new AppError(ErrorCode.NETWORK_UNAVAILABLE, 'Network unavailable', {
      technicalDetail: stderr.slice(0, 2000),
      retryable: true
    })
  }
  if (text.includes('requested format is not available') || text.includes('no video formats')) {
    return new AppError(ErrorCode.FORMAT_UNAVAILABLE, 'Requested format is not available', {
      technicalDetail: stderr.slice(0, 2000),
      retryable: false
    })
  }
  if (text.includes('no subtitles') || text.includes('there are no subtitles')) {
    return new AppError(ErrorCode.MISSING_CAPTIONS, 'No captions available for this video', {
      technicalDetail: stderr.slice(0, 2000),
      retryable: false
    })
  }
  if (text.includes('no space left') || text.includes('disk quota exceeded')) {
    return new AppError(ErrorCode.DISK_FULL, 'Disk is full', {
      technicalDetail: stderr.slice(0, 2000),
      retryable: true
    })
  }

  return new AppError(ErrorCode.DOWNLOAD_FAILED, 'Download or analysis failed', {
    technicalDetail: stderr.slice(0, 2000) || stdout.slice(0, 2000),
    retryable: true
  })
}
