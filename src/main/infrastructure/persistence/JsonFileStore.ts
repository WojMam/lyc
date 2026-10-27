import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs'
import path from 'path'

/**
 * Lightweight atomic JSON persistence under a directory.
 * Avoids ESM-only electron-store friction in the main process.
 */
export class JsonFileStore<T extends Record<string, unknown>> {
  private readonly filePath: string

  constructor(
    directory: string,
    name: string,
    private readonly defaults: T
  ) {
    mkdirSync(directory, { recursive: true })
    this.filePath = path.join(directory, `${name}.json`)
  }

  get(): T {
    if (!existsSync(this.filePath)) {
      this.set(this.defaults)
      return structuredClone(this.defaults)
    }
    try {
      const raw = readFileSync(this.filePath, 'utf8')
      const parsed = JSON.parse(raw) as Partial<T>
      return { ...structuredClone(this.defaults), ...parsed }
    } catch {
      const backup = `${this.filePath}.corrupt-${Date.now()}.bak`
      try {
        renameSync(this.filePath, backup)
      } catch {
        // ignore
      }
      this.set(this.defaults)
      return structuredClone(this.defaults)
    }
  }

  set(value: T): void {
    const tmp = `${this.filePath}.tmp`
    writeFileSync(tmp, JSON.stringify(value, null, 2), 'utf8')
    renameSync(tmp, this.filePath)
  }
}
