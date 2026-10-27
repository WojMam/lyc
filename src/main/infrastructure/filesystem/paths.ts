import { access, constants, mkdir } from 'fs/promises'
import path from 'path'
import { AppError } from '../../../shared/errors/AppError'
import { ErrorCode } from '../../../shared/errors/codes'

export async function ensureWritableDirectory(dir: string): Promise<void> {
  const resolved = path.resolve(dir)
  try {
    await mkdir(resolved, { recursive: true })
    await access(resolved, constants.W_OK)
  } catch (error) {
    throw new AppError(ErrorCode.DIRECTORY_NOT_WRITABLE, 'Directory is not writable', {
      technicalDetail: `${resolved}: ${error instanceof Error ? error.message : String(error)}`,
      retryable: true
    })
  }
}

export function resolveSafeOutputPath(directory: string, filename: string): string {
  const resolvedDir = path.resolve(directory)
  const resolvedFile = path.resolve(resolvedDir, filename)
  if (!resolvedFile.startsWith(resolvedDir + path.sep) && resolvedFile !== resolvedDir) {
    throw new AppError(ErrorCode.VALIDATION_FAILED, 'Invalid output path', {
      technicalDetail: `Path traversal detected: ${filename}`,
      retryable: false
    })
  }
  return resolvedFile
}

/** Keep path under Windows-friendly length when possible. */
export function truncatePathIfNeeded(filePath: string, maxLength = 240): string {
  if (filePath.length <= maxLength) return filePath
  const dir = path.dirname(filePath)
  const ext = path.extname(filePath)
  const base = path.basename(filePath, ext)
  const available = maxLength - dir.length - ext.length - 1
  if (available < 8) return filePath
  return path.join(dir, `${base.slice(0, available)}${ext}`)
}
