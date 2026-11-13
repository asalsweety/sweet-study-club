export type ConfirmRequest = { title: string; description?: string; confirmLabel?: string }

let current: (ConfirmRequest & { resolve: (value: boolean) => void }) | null = null
const listeners = new Set<() => void>()
const emit = () => { for (const listener of listeners) listener() }

export const confirmStore = {
  subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } },
  get: () => current,
  settle(value: boolean) {
    const request = current
    current = null
    emit()
    request?.resolve(value)
  },
}

/** Asks the person to confirm a destructive action in the app's own dialog. */
export function confirmAction(request: ConfirmRequest): Promise<boolean> {
  current?.resolve(false)
  return new Promise((resolve) => {
    current = { ...request, resolve }
    emit()
  })
}
