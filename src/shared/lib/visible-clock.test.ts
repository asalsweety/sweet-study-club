import { afterEach, describe, expect, it, vi } from 'vitest'
import { subscribeVisibleClock } from './visible-clock'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('visible display clocks', () => {
  it('does no ticking in the background and catches up immediately on return', () => {
    vi.useFakeTimers()
    const document = Object.assign(new EventTarget(), { visibilityState: 'visible' })
    vi.stubGlobal('window', globalThis)
    vi.stubGlobal('document', document)
    const update = vi.fn()
    const dispose = subscribeVisibleClock(1000, update)
    vi.advanceTimersByTime(3000)
    expect(update).toHaveBeenCalledTimes(4)
    document.visibilityState = 'hidden'
    document.dispatchEvent(new Event('visibilitychange'))
    update.mockClear()
    vi.advanceTimersByTime(60_000)
    expect(update).not.toHaveBeenCalled()
    document.visibilityState = 'visible'
    document.dispatchEvent(new Event('visibilitychange'))
    expect(update).toHaveBeenLastCalledWith(Date.now())
    dispose()
    update.mockClear()
    vi.advanceTimersByTime(2000)
    document.dispatchEvent(new Event('visibilitychange'))
    expect(update).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('does not create a repeating timer for a paused display', () => {
    vi.useFakeTimers()
    vi.stubGlobal('window', globalThis)
    vi.stubGlobal('document', Object.assign(new EventTarget(), { visibilityState: 'visible' }))
    const update = vi.fn()
    const dispose = subscribeVisibleClock(null, update)
    vi.advanceTimersByTime(60_000)
    expect(update).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
    dispose()
  })
})
