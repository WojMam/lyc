import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

/**
 * Terminate a process tree on Windows without killing arbitrary system processes.
 * Uses taskkill /T /F against a known child PID only.
 */
export async function treeKill(pid: number | undefined): Promise<void> {
  if (!pid || pid <= 0) return

  if (process.platform === 'win32') {
    try {
      await execFileAsync('taskkill', ['/pid', String(pid), '/T', '/F'], {
        windowsHide: true
      })
    } catch {
      // Process may already have exited
    }
    return
  }

  try {
    process.kill(-pid, 'SIGTERM')
  } catch {
    try {
      process.kill(pid, 'SIGTERM')
    } catch {
      // ignore
    }
  }
}

export default treeKill
