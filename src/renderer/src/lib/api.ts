import type { CompanionApi } from '../../../preload/index'

export function getApi(): CompanionApi {
  const api = window.api
  if (!api) {
    throw new Error(
      'Application bridge is unavailable (window.api). Restart with npm run dev after a clean build.'
    )
  }
  return api
}

export function hasApi(): boolean {
  return typeof window !== 'undefined' && !!window.api
}
