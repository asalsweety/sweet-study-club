import { useEffect, useRef, useState } from 'react'

export type AmbientSound = 'off' | 'rain' | 'cafe' | 'fire' | 'lofi'

export const ambientLabels: Record<AmbientSound, string> = {
  off: 'بی‌صدا',
  rain: 'باران',
  cafe: 'کافه',
  fire: 'شومینه',
  lofi: 'لوفای',
}

function noiseBuffer(context: AudioContext, kind: 'pink' | 'brown') {
  const length = context.sampleRate * 4
  const buffer = context.createBuffer(1, length, context.sampleRate)
  const data = buffer.getChannelData(0)
  let last = 0
  let b0 = 0
  let b1 = 0
  let b2 = 0
  for (let index = 0; index < length; index += 1) {
    const white = Math.random() * 2 - 1
    if (kind === 'brown') {
      last = (last + 0.02 * white) / 1.02
      data[index] = last * 3.5
    } else {
      b0 = 0.99765 * b0 + white * 0.099046
      b1 = 0.963 * b1 + white * 0.2965164
      b2 = 0.57 * b2 + white * 1.0526913
      data[index] = (b0 + b1 + b2 + white * 0.1848) * 0.11
    }
  }
  return buffer
}

function loopNoise(context: AudioContext, output: AudioNode, kind: 'pink' | 'brown', filterType: BiquadFilterType, frequency: number) {
  const source = context.createBufferSource()
  source.buffer = noiseBuffer(context, kind)
  source.loop = true
  const filter = context.createBiquadFilter()
  filter.type = filterType
  filter.frequency.value = frequency
  source.connect(filter).connect(output)
  source.start()
  return () => source.stop()
}

/** Builds one soundscape on `output`; returns a disposer. */
function buildScene(context: AudioContext, output: GainNode, sound: Exclude<AmbientSound, 'off'>) {
  const stops: (() => void)[] = []
  if (sound === 'rain') {
    stops.push(loopNoise(context, output, 'pink', 'highpass', 900))
    stops.push(loopNoise(context, output, 'brown', 'lowpass', 400))
  }
  if (sound === 'cafe') {
    stops.push(loopNoise(context, output, 'brown', 'bandpass', 500))
    stops.push(loopNoise(context, output, 'pink', 'lowpass', 1200))
  }
  if (sound === 'fire') {
    stops.push(loopNoise(context, output, 'brown', 'lowpass', 600))
    const id = window.setInterval(() => {
      // Random short crackles over a warm rumble.
      const crackle = context.createBufferSource()
      crackle.buffer = noiseBuffer(context, 'pink')
      const gain = context.createGain()
      gain.gain.setValueAtTime(0.6 * Math.random(), context.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.08)
      crackle.connect(gain).connect(output)
      crackle.start(context.currentTime, Math.random() * 3, 0.1)
    }, 180)
    stops.push(() => window.clearInterval(id))
  }
  if (sound === 'lofi') {
    const chords = [
      [220, 261.63, 329.63],
      [196, 246.94, 293.66],
      [174.61, 220, 261.63],
      [196, 233.08, 293.66],
    ]
    let step = 0
    const play = () => {
      for (const frequency of chords[step % chords.length]!) {
        const oscillator = context.createOscillator()
        oscillator.type = 'triangle'
        oscillator.frequency.value = frequency
        const gain = context.createGain()
        gain.gain.setValueAtTime(0, context.currentTime)
        gain.gain.linearRampToValueAtTime(0.08, context.currentTime + 0.8)
        gain.gain.linearRampToValueAtTime(0, context.currentTime + 3.8)
        oscillator.connect(gain).connect(output)
        oscillator.start()
        oscillator.stop(context.currentTime + 4)
      }
      step += 1
    }
    play()
    const id = window.setInterval(play, 4000)
    stops.push(() => window.clearInterval(id))
    stops.push(loopNoise(context, output, 'pink', 'lowpass', 300))
  }
  return () => stops.forEach((stop) => stop())
}

export function useAmbientSound(initial: AmbientSound = 'off') {
  const [sound, setSound] = useState<AmbientSound>(initial)
  const [volume, setVolume] = useState(0.5)
  const context = useRef<AudioContext | null>(null)
  const master = useRef<GainNode | null>(null)

  useEffect(() => {
    if (sound === 'off') return
    context.current ??= new AudioContext()
    const audio = context.current
    void audio.resume()
    const gain = audio.createGain()
    gain.gain.value = 0
    gain.gain.linearRampToValueAtTime(volume, audio.currentTime + 1.2)
    gain.connect(audio.destination)
    master.current = gain
    const dispose = buildScene(audio, gain, sound)
    return () => {
      dispose()
      gain.disconnect()
    }
    // Volume changes are applied below without rebuilding the scene.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sound])

  useEffect(() => {
    if (master.current && context.current) master.current.gain.linearRampToValueAtTime(volume, context.current.currentTime + 0.2)
  }, [volume])

  useEffect(() => () => void context.current?.close(), [])

  return { sound, setSound, volume, setVolume }
}
