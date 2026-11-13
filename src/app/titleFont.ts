/**
 * Title typeface "Mahboubeh Mehravar" (fontiran.com). The owner confirmed it is
 * free to use on the site. The file lives in the git-ignored
 * public/fonts/licensed/ folder so the public repository does not redistribute
 * it; it loads in development and in production builds made with
 * VITE_TITLE_FONT_LICENSED=true (scripts/build-production.mjs sets this when
 * the file is present). Without it, titles fall back to the free Lalezar font.
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
