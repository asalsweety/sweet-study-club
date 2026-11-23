let apiReachable = true
const listeners = new Set<() => void>()

export function canReachApi() {
  return (globalThis as { navigator?: { onLine?: boolean } }).navigator?.onLine !== false && apiReachable
}

export function subscribeToApiReachability(onChange: () => void) {
  listeners.add(onChange)
  return () => { listeners.delete(onChange) }
}

export function reportApiReachability(reachable: boolean) {
  if (apiReachable === reachable) return
  apiReachable = reachable
  for (const listener of listeners) listener()
}
