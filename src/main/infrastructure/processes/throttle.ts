export function createThrottledEmitter<T>(
  intervalMs: number,
  emit: (value: T) => void
): (value: T) => void {
  let last = 0
  let pending: T | null = null
  let timer: NodeJS.Timeout | null = null

  const flush = (): void => {
    timer = null
    if (pending !== null) {
      const value = pending
      pending = null
      last = Date.now()
      emit(value)
    }
  }

  return (value: T) => {
    const now = Date.now()
    if (now - last >= intervalMs) {
      last = now
      emit(value)
      return
    }
    pending = value
    if (!timer) {
      timer = setTimeout(flush, intervalMs - (now - last))
    }
  }
}
