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

let silentLoop: HTMLAudioElement | null = null

/** A short silent WAV, built once, for the iOS audio-session unlock below. */
function silentWavUrl() {
  const samples = 800
  const buffer = new ArrayBuffer(44 + samples * 2)
  const view = new DataView(buffer)
  const text = (offset: number, value: string) => { for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i)) }
  text(0, 'RIFF'); view.setUint32(4, 36 + samples * 2, true); text(8, 'WAVE'); text(12, 'fmt ')
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true)
  view.setUint32(24, 8000, true); view.setUint32(28, 16000, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true)
  text(36, 'data'); view.setUint32(40, samples * 2, true)
  return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }))
}

/**
 * iPhones route Web Audio through the ringer, so the silent switch mutes it.
 * Playing a looping silent <audio> element inside the tap switches the page
 * to media playback, which the silent switch does not mute.
 */
function holdMediaSession(on: boolean) {
  if (!on) { silentLoop?.pause(); return }
  if (!silentLoop) {
    silentLoop = new Audio(silentWavUrl())
    silentLoop.loop = true
    silentLoop.setAttribute('playsinline', '')
  }
  void silentLoop.play().catch(() => undefined)
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
    gain.gain.setValueAtTime(0, audio.currentTime)
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
    if (master.current && context.current) {
      const now = context.current.currentTime
      master.current.gain.cancelScheduledValues(now)
      master.current.gain.setValueAtTime(master.current.gain.value, now)
      master.current.gain.linearRampToValueAtTime(volume, now + 0.2)
    }
  }, [volume])

  useEffect(() => () => {
    const audio = context.current
    context.current = null
    master.current = null
    if (audio && audio.state !== 'closed') void audio.close()
    holdMediaSession(false)
  }, [])

  // Called from the tap itself: browsers (iOS Safari especially) only let a
  // page start audio synchronously inside a user gesture.
  const choose = (next: AmbientSound) => {
    if (next !== 'off') {
      if (!context.current || context.current.state === 'closed') context.current = new AudioContext()
      void context.current.resume()
      holdMediaSession(true)
    } else {
      holdMediaSession(false)
    }
    setSound(next)
  }

  return { sound, setSound: choose, volume, setVolume }
}
