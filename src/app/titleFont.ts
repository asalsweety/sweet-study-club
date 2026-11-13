/**
 * Title typeface. "Mahboubeh Mehravar" is a commercial fontiran.com font: its
 * terms allow use on a personal computer but require a website license before
 * the file is served from a public server. It therefore lives in the
 * git-ignored public/fonts/licensed/ folder, loads during local development,
 * and is only shipped in a production build when VITE_TITLE_FONT_LICENSED is
 * "true" (vite.config.ts strips the folder from builds otherwise). Without it,
 * titles fall back to the free Lalezar font.
 */
export function loadTitleFont() {
  const allowed = import.meta.env.DEV || import.meta.env.VITE_TITLE_FONT_LICENSED === 'true'
  if (!allowed || typeof FontFace === 'undefined') return
  const face = new FontFace('Mahboubeh Mehravar', 'url(/fonts/licensed/mahboubeh-mehravar.woff2) format("woff2")', { display: 'swap' })
  face.load()
    .then((loaded) => {
      document.fonts.add(loaded)
      document.documentElement.classList.add('title-font-ready')
    })
    .catch(() => { /* Missing file: keep the free fallback. */ })
}
