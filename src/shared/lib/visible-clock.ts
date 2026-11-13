/** Display clocks stop while hidden, then catch up from wall time on return. */
export function subscribeVisibleClock(intervalMs: number | null, update: (now: number) => void) {
  let interval: number | undefined
  const sync = () => {
    window.clearInterval(interval)
    interval = undefined
    update(Date.now())
    if (intervalMs !== null && document.visibilityState === 'visible') {
      interval = window.setInterval(() => update(Date.now()), intervalMs)
    }
  }
  sync()
  document.addEventListener('visibilitychange', sync)
  return () => {
    window.clearInterval(interval)
    document.removeEventListener('visibilitychange', sync)
  }
}
