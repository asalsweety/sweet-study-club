import { useSyncExternalStore } from 'react'

export type Toast = { id: string; text: string; icon?: string | undefined; leaving?: boolean }

let toasts: Toast[] = []
const listeners = new Set<() => void>()
const emit = () => { for (const listener of listeners) listener() }

function remove(id: string) {
  toasts = toasts.map((toast) => toast.id === id ? { ...toast, leaving: true } : toast)
  emit()
  // Matches the toast-out animation before the node leaves the DOM.
  window.setTimeout(() => {
    toasts = toasts.filter((toast) => toast.id !== id)
    emit()
  }, 220)
}

/** Shows a short, self-dismissing message at the top of the screen. */
export function toast(text: string, options: { icon?: string; duration?: number } = {}) {
  const id = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : String(Math.random())
  toasts = [...toasts.filter((item) => !item.leaving).slice(-2), { id, text, icon: options.icon }]
  emit()
  window.setTimeout(() => remove(id), options.duration ?? 5200)
  return id
}

toast.dismiss = remove

export function useToasts() {
  return useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => listeners.delete(listener) },
    () => toasts,
    () => toasts,
  )
}
