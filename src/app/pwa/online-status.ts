import { useSyncExternalStore } from 'react'
import { canReachApi, subscribeToApiReachability } from '../../shared/api/reachability'

export function subscribeToConnection(onChange: () => void) {
  const unsubscribe = subscribeToApiReachability(onChange)
  window.addEventListener('online', onChange)
  window.addEventListener('offline', onChange)
  return () => {
    unsubscribe()
    window.removeEventListener('online', onChange)
    window.removeEventListener('offline', onChange)
  }
}

export function useOnlineStatus() {
  return useSyncExternalStore(subscribeToConnection, canReachApi, () => true)
}
