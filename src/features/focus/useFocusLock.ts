import { useEffect } from 'react'

export function useFocusLock(active: boolean) {
  useEffect(() => {
    if (!active) return
    // Browsers report screen lock and app switching as the same visibility
    // event. Warn only when the learner explicitly leaves the page.
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [active])
}
