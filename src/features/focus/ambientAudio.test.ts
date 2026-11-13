import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildScene } from './ambientAudio'

function audioHarness() {
  const createSource = () => ({
    connect: vi.fn((target) => target), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn(),
    buffer: null, onended: null as (() => void) | null, frequency: { value: 0 },
  })
  const sources: ReturnType<typeof createSource>[] = []
  function source() {
    const node = createSource()
    sources.push(node)
    return node
  }
  const gain = () => ({
    connect: vi.fn((target) => target), disconnect: vi.fn(),
    gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
  })
  const context = {
    sampleRate: 8000, currentTime: 0,
    createBuffer: vi.fn((_channels, length) => ({ getChannelData: () => new Float32Array(length) })),
    createBufferSource: vi.fn(source), createOscillator: vi.fn(source), createGain: vi.fn(gain),
    createBiquadFilter: vi.fn(() => ({ connect: vi.fn((target) => target), disconnect: vi.fn(), frequency: { value: 0 } })),
  }
  return { context, output: gain(), sources }
}

afterEach(() => vi.useRealTimers())

describe('ambient audio lifetime', () => {
  it('reuses fire noise through hundreds of crackles and stops work on disposal', () => {
    vi.useFakeTimers()
    const { context, output, sources } = audioHarness()
    const dispose = buildScene(context as unknown as AudioContext, output as unknown as GainNode, 'fire')
    vi.advanceTimersByTime(60_000)
    expect(sources.length).toBeGreaterThan(300)
    expect(context.createBuffer).toHaveBeenCalledTimes(2)
    expect(sources[1]?.buffer).toBe(sources[2]?.buffer)
    const ended = sources[1]!
    ended.onended?.()
    expect(ended.disconnect).toHaveBeenCalledOnce()
    dispose()
    expect(sources.at(-1)?.stop).toHaveBeenCalledOnce()
    const count = sources.length
    vi.advanceTimersByTime(60_000)
    expect(sources).toHaveLength(count)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('stops unfinished lofi notes immediately when the sound changes', () => {
    vi.useFakeTimers()
    const { context, output, sources } = audioHarness()
    const dispose = buildScene(context as unknown as AudioContext, output as unknown as GainNode, 'lofi')
    dispose()
    for (const oscillator of sources.slice(0, 3)) expect(oscillator.stop).toHaveBeenLastCalledWith()
    expect(vi.getTimerCount()).toBe(0)
  })
})
