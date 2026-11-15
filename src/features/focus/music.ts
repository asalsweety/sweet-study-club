export type MusicProvider = 'youtube' | 'soundcloud' | 'spotify'
export type MusicEmbed = { provider: MusicProvider; src: string; height: number }

const youtubeId = /^[A-Za-z0-9_-]{11}$/

/** Turns a YouTube, SoundCloud or Spotify link into its official embed player. */
export function musicEmbed(raw: string): MusicEmbed | null {
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    return null
  }
  if (url.protocol !== 'https:') return null
  const host = url.hostname.toLowerCase().replace(/^(www|m)\./, '')

  if (host === 'youtube.com' || host === 'music.youtube.com' || host === 'youtu.be') {
    const list = url.searchParams.get('list')
    let id = host === 'youtu.be' ? url.pathname.slice(1) : url.searchParams.get('v')
    if (!id) {
      const match = url.pathname.match(/^\/(?:shorts|live|embed)\/([A-Za-z0-9_-]{11})/)
      id = match?.[1] ?? null
    }
    const params = 'autoplay=1&rel=0&modestbranding=1'
    if (id && youtubeId.test(id)) return { provider: 'youtube', src: `https://www.youtube-nocookie.com/embed/${id}?${params}&loop=1&playlist=${id}`, height: 180 }
    if (list && /^[A-Za-z0-9_-]+$/.test(list)) return { provider: 'youtube', src: `https://www.youtube-nocookie.com/embed/videoseries?list=${list}&${params}`, height: 180 }
    return null
  }

  if (host === 'soundcloud.com' || host === 'on.soundcloud.com') {
    const clean = `https://${url.hostname}${url.pathname}`
    return { provider: 'soundcloud', src: `https://w.soundcloud.com/player/?url=${encodeURIComponent(clean)}&auto_play=true&visual=false&hide_related=true&show_comments=false&show_reposts=false&color=%2328624e`, height: 120 }
  }

  if (host === 'open.spotify.com') {
    const match = url.pathname.match(/^\/(?:intl-[a-z]{2}(?:-[a-z]{2})?\/)?(track|album|playlist|episode|show|artist)\/([A-Za-z0-9]+)/)
    if (!match) return null
    return { provider: 'spotify', src: `https://open.spotify.com/embed/${match[1]}/${match[2]}?utm_source=generator&theme=0`, height: match[1] === 'track' || match[1] === 'episode' ? 152 : 232 }
  }
  return null
}

export const providerLabels: Record<MusicProvider, string> = { youtube: 'یوتیوب', soundcloud: 'ساندکلاد', spotify: 'اسپاتیفای' }

/** A readable default title from the link itself. */
export function guessTitle(raw: string) {
  const embed = musicEmbed(raw)
  return embed ? `${providerLabels[embed.provider]}` : 'موسیقی'
}
