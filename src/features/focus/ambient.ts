import { useEffect, useRef, useState } from 'react'
import { buildScene } from './ambientAudio'

export type AmbientSound = 'off' | 'rain' | 'cafe' | 'fire' | 'lofi'

export const ambientLabels: Record<AmbientSound, string> = {
  off: 'بی‌صدا',
  rain: 'باران',
  cafe: 'کافه',
  fire: 'شومینه',
  lofi: 'لوفای',
}

export function useAmbientSound(initial: AmbientSound = 'off') {
  const [sound, setSound] = useState<AmbientSound>(initial)
  const [volume, setVolume] = useState(0.5)
  const context = useRef<AudioContext | null>(null)
  const master = useRef<GainNode | null>(null)

  useEffect(() => {
    if (sound === 'off') {
      if (context.current?.state === 'running') void context.current.suspend()
      return
    }
    if (!context.current || context.current.state === 'closed') context.current = new AudioContext()
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
      master.current = null
    }
    // Volume changes are applied below without rebuilding the scene.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sound])

  useEffect(() => {
    if (master.current && context.current) master.current.gain.linearRampToValueAtTime(volume, context.current.currentTime + 0.2)
  }, [volume])

  useEffect(() => () => {
    const audio = context.current
    context.current = null
    master.current = null
    if (audio && audio.state !== 'closed') void audio.close()
  }, [])

  return { sound, setSound, volume, setVolume }
}
