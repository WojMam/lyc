import { appendFileSync, mkdirSync, readdirSync, unlinkSync } from 'fs'
import path from 'path'
import { app } from 'electron'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export class Logger {
  private readonly dir: string
  private readonly file: string

  constructor() {
    this.dir = path.join(app.getPath('userData'), 'logs')
    mkdirSync(this.dir, { recursive: true })
    const stamp = new Date().toISOString().slice(0, 10)
    this.file = path.join(this.dir, `app-${stamp}.log`)
    this.prune()
  }

  private prune(): void {
    try {
      const files = readdirSync(this.dir)
        .filter((f) => f.startsWith('app-') && f.endsWith('.log'))
        .sort()
      while (files.length > 14) {
        const oldest = files.shift()
        if (oldest) unlinkSync(path.join(this.dir, oldest))
      }
    } catch {
      // ignore
    }
  }

  log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      level,
      message,
      ...meta
    })
    try {
      appendFileSync(this.file, line + '\n', 'utf8')
    } catch {
      // ignore disk errors for logging
    }
    if (level === 'error') console.error(message, meta ?? '')
    else if (level === 'warn') console.warn(message, meta ?? '')
    else console.log(message, meta ?? '')
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.log('info', message, meta)
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.log('warn', message, meta)
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.log('error', message, meta)
  }

  getLogDirectory(): string {
    return this.dir
  }

  getCurrentLogFile(): string {
    return this.file
  }
}
