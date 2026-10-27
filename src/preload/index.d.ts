import type { CompanionApi } from './index'

declare global {
  interface Window {
    api: CompanionApi
  }
}

export {}
