import { access, constants } from 'fs/promises'
import path from 'path'
import { app } from 'electron'
import type { ApplicationSettings, ToolHealth } from '../../../shared/domain/types'
import type { IProcessRunner } from '../processes/ProcessRunner'

export type ToolName = 'ytDlp' | 'ffmpeg' | 'ffprobe' | 'deno'

export class ToolPathResolver {
  constructor(
    private readonly processRunner: IProcessRunner,
    private readonly getSettings: () => ApplicationSettings
  ) {}

  getVendorBinDir(): string {
    if (app.isPackaged) {
      return path.join(process.resourcesPath, 'bin')
    }
    return path.join(app.getAppPath(), 'vendor', 'bin')
  }

  resolve(tool: ToolName): string {
    const settings = this.getSettings()
    const override = settings.toolOverrides[tool]
    if (override) return path.resolve(override)

    const bin = this.getVendorBinDir()
    const map: Record<ToolName, string> = {
      ytDlp: path.join(bin, 'yt-dlp.exe'),
      ffmpeg: path.join(bin, 'ffmpeg.exe'),
      ffprobe: path.join(bin, 'ffprobe.exe'),
      deno: path.join(bin, 'deno.exe')
    }
    return map[tool]
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      await access(filePath, constants.X_OK)
      return true
    } catch {
      try {
        await access(filePath, constants.F_OK)
        return true
      } catch {
        return false
      }
    }
  }

  async checkHealth(): Promise<ToolHealth[]> {
    const tools: Array<{ name: ToolHealth['name']; tool: ToolName; versionArgs: string[] }> = [
      { name: 'yt-dlp', tool: 'ytDlp', versionArgs: ['--version'] },
      { name: 'ffmpeg', tool: 'ffmpeg', versionArgs: ['-version'] },
      { name: 'ffprobe', tool: 'ffprobe', versionArgs: ['-version'] },
      { name: 'deno', tool: 'deno', versionArgs: ['--version'] }
    ]

    const results: ToolHealth[] = []
    for (const t of tools) {
      const toolPath = this.resolve(t.tool)
      const present = await this.exists(toolPath)
      if (!present) {
        results.push({
          name: t.name,
          status: 'missing',
          path: toolPath,
          detail: 'Executable not found'
        })
        continue
      }

      try {
        const result = await this.processRunner.run(toolPath, t.versionArgs, { timeoutMs: 15_000 })
        if (result.exitCode !== 0) {
          results.push({
            name: t.name,
            status: 'invalid',
            path: toolPath,
            detail: result.stderr.slice(0, 500) || `Exit code ${result.exitCode}`
          })
          continue
        }
        const version = extractVersion(t.name, result.stdout || result.stderr)
        results.push({
          name: t.name,
          status: 'available',
          path: toolPath,
          version
        })
      } catch (error) {
        results.push({
          name: t.name,
          status: 'invalid',
          path: toolPath,
          detail: error instanceof Error ? error.message : String(error)
        })
      }
    }
    return results
  }
}

function extractVersion(name: string, output: string): string {
  const first = output.split(/\r?\n/).find((l) => l.trim()) ?? output
  if (name === 'yt-dlp') return first.trim()
  if (name === 'deno') {
    const m = first.match(/deno\s+([\d.]+)/i)
    return m?.[1] ?? first.trim()
  }
  const m = first.match(/version\s+([\d.]+)/i) ?? first.match(/n?([\d]+\.[\d]+(?:\.[\d]+)?)/)
  return m?.[1] ?? first.trim().slice(0, 80)
}
