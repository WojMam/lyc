import { spawn, type ChildProcessWithoutNullStreams } from 'child_process'
import { EventEmitter } from 'events'
import treeKill from './treeKill'

export interface RunOptions {
  cwd?: string
  env?: NodeJS.ProcessEnv
  timeoutMs?: number
  maxBufferBytes?: number
  signal?: AbortSignal
  onStdout?: (chunk: string) => void
  onStderr?: (chunk: string) => void
}

export interface RunResult {
  exitCode: number | null
  signal: NodeJS.Signals | null
  stdout: string
  stderr: string
  canceled: boolean
  timedOut: boolean
}

export interface IProcessRunner {
  run(executable: string, args: string[], options?: RunOptions): Promise<RunResult>
}

const DEFAULT_MAX_BUFFER = 16 * 1024 * 1024

export class ProcessRunner implements IProcessRunner {
  async run(executable: string, args: string[], options: RunOptions = {}): Promise<RunResult> {
    const maxBuffer = options.maxBufferBytes ?? DEFAULT_MAX_BUFFER
    let stdout = ''
    let stderr = ''
    let timedOut = false
    let canceled = false
    let settled = false

    return new Promise<RunResult>((resolve, reject) => {
      let child: ChildProcessWithoutNullStreams
      try {
        child = spawn(executable, args, {
          cwd: options.cwd,
          env: { ...process.env, ...options.env },
          shell: false,
          windowsHide: true
        })
      } catch (error) {
        reject(error)
        return
      }

      const finish = (result: RunResult): void => {
        if (settled) return
        settled = true
        cleanup()
        resolve(result)
      }

      const onAbort = (): void => {
        canceled = true
        void treeKill(child.pid)
      }

      const cleanup = (): void => {
        if (timer) clearTimeout(timer)
        options.signal?.removeEventListener('abort', onAbort)
      }

      let timer: NodeJS.Timeout | undefined
      if (options.timeoutMs && options.timeoutMs > 0) {
        timer = setTimeout(() => {
          timedOut = true
          void treeKill(child.pid)
        }, options.timeoutMs)
      }

      if (options.signal) {
        if (options.signal.aborted) {
          onAbort()
        } else {
          options.signal.addEventListener('abort', onAbort, { once: true })
        }
      }

      child.stdout.setEncoding('utf8')
      child.stderr.setEncoding('utf8')

      child.stdout.on('data', (chunk: string) => {
        if (stdout.length < maxBuffer) {
          const remaining = maxBuffer - stdout.length
          stdout += chunk.slice(0, remaining)
        }
        options.onStdout?.(chunk)
      })

      child.stderr.on('data', (chunk: string) => {
        if (stderr.length < maxBuffer) {
          const remaining = maxBuffer - stderr.length
          stderr += chunk.slice(0, remaining)
        }
        options.onStderr?.(chunk)
      })

      child.on('error', (error) => {
        cleanup()
        if (!settled) {
          settled = true
          reject(error)
        }
      })

      child.on('close', (exitCode, signal) => {
        finish({
          exitCode,
          signal,
          stdout,
          stderr,
          canceled,
          timedOut
        })
      })
    })
  }
}

export class MockProcessRunner extends EventEmitter implements IProcessRunner {
  private handlers: Array<
    (exe: string, args: string[], options?: RunOptions) => Promise<RunResult>
  > = []

  onRun(handler: (exe: string, args: string[], options?: RunOptions) => Promise<RunResult>): void {
    this.handlers.push(handler)
  }

  async run(executable: string, args: string[], options?: RunOptions): Promise<RunResult> {
    const handler = this.handlers.shift()
    if (!handler) {
      throw new Error(`Unexpected process spawn: ${executable} ${args.join(' ')}`)
    }
    return handler(executable, args, options)
  }
}
