import type { AppErrorDto } from '../domain/types'
import { ErrorCode } from './codes'

export class AppError extends Error {
  readonly code: ErrorCode
  readonly technicalDetail?: string
  readonly retryable: boolean

  constructor(
    code: ErrorCode,
    message: string,
    options?: { technicalDetail?: string; retryable?: boolean; cause?: unknown }
  ) {
    super(message, options?.cause ? { cause: options.cause } : undefined)
    this.name = 'AppError'
    this.code = code
    this.technicalDetail = options?.technicalDetail
    this.retryable = options?.retryable ?? false
  }

  toDto(): AppErrorDto {
    return {
      code: this.code,
      message: this.message,
      technicalDetail: this.technicalDetail,
      retryable: this.retryable
    }
  }

  static fromUnknown(error: unknown, fallbackCode: ErrorCode = ErrorCode.UNKNOWN): AppError {
    if (error instanceof AppError) return error
    if (error instanceof Error) {
      return new AppError(fallbackCode, error.message, {
        technicalDetail: error.stack,
        retryable: true,
        cause: error
      })
    }
    return new AppError(fallbackCode, String(error), { retryable: true })
  }
}
