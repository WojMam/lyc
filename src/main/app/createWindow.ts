import { BrowserWindow, shell } from 'electron'
import { existsSync } from 'fs'
import { join } from 'path'
import { is } from '../isDev'

function resolvePreloadPath(): string {
  const candidates = [
    join(__dirname, '../preload/index.js'),
    join(__dirname, '../preload/index.mjs'),
    join(__dirname, '../../out/preload/index.js')
  ]
  const found = candidates.find((p) => existsSync(p))
  if (!found) {
    console.error('[main] Preload script not found. Tried:', candidates)
    return candidates[0]!
  }
  console.log('[main] Using preload:', found)
  return found
}

export function createMainWindow(): BrowserWindow {
  const preload = resolvePreloadPath()

  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1100,
    minHeight: 720,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0b0f17',
    webPreferences: {
      preload,
      contextIsolation: true,
      nodeIntegration: false,
      // electron-vite preload bundles rely on a non-sandboxed preload context.
      // Security is still enforced via contextIsolation + no nodeIntegration + CSP.
      sandbox: false,
      webSecurity: true,
      spellcheck: false
    }
  })

  win.webContents.on('preload-error', (_event, preloadPath, error) => {
    console.error('[main] Preload failed:', preloadPath, error)
  })

  win.on('ready-to-show', () => {
    win.show()
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) {
      void shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  win.webContents.on('will-navigate', (event, url) => {
    const allowed =
      url.startsWith('http://localhost') ||
      url.startsWith('file://') ||
      (is.dev &&
        !!process.env['ELECTRON_RENDERER_URL'] &&
        url.startsWith(process.env['ELECTRON_RENDERER_URL']))
    if (!allowed) {
      event.preventDefault()
    }
  })

  // CSP: allow Vite HMR in development; keep production tight.
  win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    const csp = is.dev
      ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https: blob:; connect-src 'self' ws: wss: http://localhost:* https://i.ytimg.com; media-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
      : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https://i.ytimg.com https://*.googleusercontent.com https://*.ggpht.com https://img.youtube.com; connect-src 'self' https://i.ytimg.com; media-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"

    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp]
      }
    })
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    void win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}
