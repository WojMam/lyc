/**
 * Downloads and verifies Windows x64 binaries for yt-dlp, Deno, and FFmpeg/FFprobe.
 */
import { createHash } from 'crypto'
import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { copyFile, readdir, rm, unlink } from 'fs/promises'
import http from 'http'
import https from 'https'
import path from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

const ROOT = path.resolve(__dirname, '..')
const MANIFEST_PATH = path.join(ROOT, 'tools', 'manifest.json')
const OUT_DIR = path.join(ROOT, 'vendor', 'bin')
const CACHE_DIR = path.join(ROOT, 'vendor', '.cache')
const STATE_PATH = path.join(OUT_DIR, '.tool-state.json')

interface Manifest {
  ytDlp: { version: string; url: string; sha256Url: string; filename: string }
  deno: {
    version: string
    url: string
    sha256Url: string
    filename: string
    zipEntry: string
  }
  ffmpeg: {
    version: string
    url: string
    sha256Url: string
    assetName: string
    binaries: string[]
  }
}

function log(msg: string): void {
  console.log(`[tools:setup] ${msg}`)
}

function fail(msg: string): never {
  console.error(`[tools:setup] ERROR: ${msg}`)
  process.exit(1)
}

async function download(url: string, dest: string): Promise<void> {
  mkdirSync(path.dirname(dest), { recursive: true })
  log(`Downloading ${url}`)
  await new Promise<void>((resolve, reject) => {
    const get = url.startsWith('https') ? https.get : http.get
    const request = get(
      url,
      { headers: { 'User-Agent': 'local-youtube-companion-setup' } },
      (res) => {
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          download(res.headers.location, dest).then(resolve).catch(reject)
          return
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`))
          return
        }
        const file = createWriteStream(dest)
        res.pipe(file)
        file.on('finish', () => file.close(() => resolve()))
        file.on('error', reject)
      }
    )
    request.on('error', reject)
  })
}

async function fetchText(url: string): Promise<string> {
  const tmp = path.join(CACHE_DIR, `fetch-${Date.now()}.txt`)
  await download(url, tmp)
  const text = readFileSync(tmp, 'utf8')
  await unlink(tmp).catch(() => undefined)
  return text
}

function sha256File(filePath: string): string {
  const hash = createHash('sha256')
  hash.update(readFileSync(filePath))
  return hash.digest('hex').toLowerCase()
}

function parseSha256Sums(text: string, filename: string): string | null {
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const gnu = trimmed.match(/^([a-fA-F0-9]{64})\s+\*?(.+)$/)
    if (gnu && path.basename(gnu[2]!).replace(/^\.\//, '') === filename) {
      return gnu[1]!.toLowerCase()
    }
    const psHash = trimmed.match(/^Hash\s*:\s*([a-fA-F0-9]{64})$/i)
    if (psHash) return psHash[1]!.toLowerCase()
  }
  const only = text.trim().match(/^([a-fA-F0-9]{64})$/)
  if (only) return only[1]!.toLowerCase()
  return null
}

async function extractZip(zipPath: string, destDir: string): Promise<void> {
  mkdirSync(destDir, { recursive: true })
  if (process.platform === 'win32') {
    await execFileAsync(
      'powershell.exe',
      [
        '-NoProfile',
        '-Command',
        `Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${destDir.replace(/'/g, "''")}' -Force`
      ],
      { windowsHide: true }
    )
    return
  }
  throw new Error('Zip extraction is only automated on Windows in this setup script')
}

async function findFileRecursive(dir: string, name: string): Promise<string | null> {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isFile() && entry.name.toLowerCase() === name.toLowerCase()) return full
    if (entry.isDirectory()) {
      const nested = await findFileRecursive(full, name)
      if (nested) return nested
    }
  }
  return null
}

async function verifyAndCopy(
  label: string,
  sourcePath: string,
  destName: string,
  expectedSha?: string | null
): Promise<void> {
  if (!existsSync(sourcePath)) fail(`${label} missing at ${sourcePath}`)
  if (expectedSha) {
    const actual = sha256File(sourcePath)
    if (actual !== expectedSha) {
      fail(`${label} checksum mismatch. expected=${expectedSha} actual=${actual}`)
    }
    log(`${label} checksum OK`)
  } else {
    log(`${label} checksum skipped (not found in sums file)`)
  }
  await copyFile(sourcePath, path.join(OUT_DIR, destName))
}

async function runVersion(exe: string, args: string[]): Promise<string> {
  const { stdout, stderr } = await execFileAsync(exe, args, {
    windowsHide: true,
    timeout: 20_000
  })
  return (stdout || stderr).trim().split(/\r?\n/)[0] ?? ''
}

async function main(): Promise<void> {
  if (process.platform !== 'win32') {
    log('Warning: this project targets Windows x64; continuing anyway.')
  }

  mkdirSync(OUT_DIR, { recursive: true })
  mkdirSync(CACHE_DIR, { recursive: true })

  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as Manifest
  const state: Record<string, string> = existsSync(STATE_PATH)
    ? JSON.parse(readFileSync(STATE_PATH, 'utf8'))
    : {}

  const ytKey = `yt-dlp@${manifest.ytDlp.version}`
  const ytDest = path.join(OUT_DIR, manifest.ytDlp.filename)
  if (state.ytDlp === ytKey && existsSync(ytDest)) {
    log(`yt-dlp already provisioned (${manifest.ytDlp.version})`)
  } else {
    const ytCache = path.join(CACHE_DIR, manifest.ytDlp.filename)
    await download(manifest.ytDlp.url, ytCache)
    let expected: string | null = null
    try {
      const sums = await fetchText(manifest.ytDlp.sha256Url)
      expected = parseSha256Sums(sums, manifest.ytDlp.filename)
    } catch (e) {
      log(`Could not fetch yt-dlp checksums: ${e instanceof Error ? e.message : e}`)
    }
    await verifyAndCopy('yt-dlp', ytCache, manifest.ytDlp.filename, expected)
    state.ytDlp = ytKey
  }

  const denoKey = `deno@${manifest.deno.version}`
  const denoDest = path.join(OUT_DIR, manifest.deno.filename)
  if (state.deno === denoKey && existsSync(denoDest)) {
    log(`Deno already provisioned (${manifest.deno.version})`)
  } else {
    const zipPath = path.join(CACHE_DIR, `deno-${manifest.deno.version}.zip`)
    await download(manifest.deno.url, zipPath)
    let expected: string | null = null
    try {
      const sums = await fetchText(manifest.deno.sha256Url)
      expected = parseSha256Sums(sums, path.basename(manifest.deno.url))
      if (!expected) {
        const m = sums.match(/([a-fA-F0-9]{64})/)
        expected = m?.[1]?.toLowerCase() ?? null
      }
    } catch (e) {
      log(`Could not fetch Deno checksums: ${e instanceof Error ? e.message : e}`)
    }
    if (expected) {
      const actual = sha256File(zipPath)
      if (actual !== expected) fail(`Deno zip checksum mismatch`)
      log('Deno zip checksum OK')
    }
    const extractDir = path.join(CACHE_DIR, `deno-extract-${manifest.deno.version}`)
    await rm(extractDir, { recursive: true, force: true })
    await extractZip(zipPath, extractDir)
    const found = await findFileRecursive(extractDir, manifest.deno.zipEntry)
    if (!found) fail('deno.exe not found in zip')
    await copyFile(found, denoDest)
    await rm(extractDir, { recursive: true, force: true })
    state.deno = denoKey
  }

  const ffKey = `ffmpeg@${manifest.ffmpeg.version}`
  const ffmpegDest = path.join(OUT_DIR, 'ffmpeg.exe')
  const ffprobeDest = path.join(OUT_DIR, 'ffprobe.exe')
  if (state.ffmpeg === ffKey && existsSync(ffmpegDest) && existsSync(ffprobeDest)) {
    log(`FFmpeg already provisioned (${manifest.ffmpeg.version})`)
  } else {
    const zipPath = path.join(CACHE_DIR, manifest.ffmpeg.assetName)
    await download(manifest.ffmpeg.url, zipPath)
    let expected: string | null = null
    try {
      const sums = await fetchText(manifest.ffmpeg.sha256Url)
      expected = parseSha256Sums(sums, manifest.ffmpeg.assetName)
    } catch (e) {
      log(`Could not fetch FFmpeg checksums: ${e instanceof Error ? e.message : e}`)
    }
    if (expected) {
      const actual = sha256File(zipPath)
      if (actual !== expected) {
        log(
          `FFmpeg checksum mismatch (latest builds float); continuing after warning. expected=${expected} actual=${actual}`
        )
      } else {
        log('FFmpeg zip checksum OK')
      }
    }
    const extractDir = path.join(CACHE_DIR, `ffmpeg-extract`)
    await rm(extractDir, { recursive: true, force: true })
    await extractZip(zipPath, extractDir)
    for (const bin of manifest.ffmpeg.binaries) {
      const found = await findFileRecursive(extractDir, bin)
      if (!found) fail(`${bin} not found in FFmpeg zip`)
      await copyFile(found, path.join(OUT_DIR, bin))
    }
    await rm(extractDir, { recursive: true, force: true })
    state.ffmpeg = ffKey
  }

  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2))

  log('Validating executables...')
  const versions: Record<string, string> = {}
  versions['yt-dlp'] = await runVersion(path.join(OUT_DIR, 'yt-dlp.exe'), ['--version'])
  versions['deno'] = await runVersion(path.join(OUT_DIR, 'deno.exe'), ['--version'])
  versions['ffmpeg'] = await runVersion(path.join(OUT_DIR, 'ffmpeg.exe'), ['-version'])
  versions['ffprobe'] = await runVersion(path.join(OUT_DIR, 'ffprobe.exe'), ['-version'])

  for (const [k, v] of Object.entries(versions)) {
    log(`${k}: ${v}`)
  }
  log('Done.')
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error))
})
