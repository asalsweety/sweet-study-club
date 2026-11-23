import { VitePWA } from 'vite-plugin-pwa'
import { existsSync } from 'node:fs'

export function pwaPlugins() {
  const pwaPlugins = VitePWA({
    registerType: 'prompt',
    includeAssets: ['icons/favicon.png', 'icons/apple-touch-icon.png'],
    manifest: {
      id: '/',
      name: 'باشگاه مطالعه شیرین',
      short_name: 'Sweet Study',
      description: 'تایمر، پلنر، پیشرفت و مطالعه‌ی زنده با دوستان',
      lang: 'fa',
      dir: 'rtl',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      orientation: 'portrait',
      background_color: '#feeac7',
      theme_color: '#feeac7',
      categories: ['education', 'productivity'],
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        { src: '/icons/favicon.png', sizes: '64x64', type: 'image/png', purpose: 'any' },
      ],
      shortcuts: [
        { name: 'شروع مطالعه', short_name: 'مطالعه', url: '/', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
        { name: 'پلنر', url: '/planner', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
        { name: 'دوستان و مطالعه‌ی زنده', short_name: 'دوستان', url: '/friends', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
        { name: 'کتابخانۀ آفلاین', url: '/offline', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      ],
    },
    workbox: {
      cleanupOutdatedCaches: true,
      globPatterns: [
        'index.html', 'favicon.svg', 'assets/**/*.{js,css,svg,png,woff2}', 'icons/*.{png,svg}',
        ...(process.env.VITE_TITLE_FONT_LICENSED === 'true' && existsSync('public/fonts/licensed/mahboubeh-mehravar.woff2')
          ? ['fonts/licensed/mahboubeh-mehravar.woff2'] : []),
        'images/figma/{club-logo,helper-asal,today-*,modal-*,social-league-library}.webp',
        'images/pixel/study-rooms/*.webp', 'images/chibi-pack/*.webp',
        'images/study-stickers/{bee,books,honey,library,cottage}.webp',
      ],
      globIgnores: [
        '**/html2canvas-*.js',
        '**/purify*.js',
      ],
      navigateFallback: '/index.html',
      navigateFallbackDenylist: [
        /^\/(?:api|assets|icons|images|fonts|question-media|\.well-known)(?:[/?]|$)/,
        /^\/(?:revision\.txt|sw\.js|manifest\.webmanifest)(?:\?|$)/,
      ],
      runtimeCaching: [{
        urlPattern: ({ sameOrigin, request, url }) =>
          sameOrigin && request.destination === 'image' && url.pathname.startsWith('/images/'),
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'study-artwork',
          expiration: { maxEntries: 80 },
          cacheableResponse: { statuses: [200] },
        },
      }, {
        urlPattern: ({ sameOrigin, request, url }) =>
          sameOrigin && request.destination === 'script' && /^\/assets\/html2canvas-[\w-]+\.js$/.test(url.pathname),
        handler: 'CacheFirst',
        options: {
          cacheName: 'study-export-tools',
          expiration: { maxEntries: 3 },
          cacheableResponse: { statuses: [200] },
        },
      }],
    },
  })

  for (const plugin of pwaPlugins) {
    plugin.applyToEnvironment = (environment) =>
      environment.name === 'client'
  }

  return pwaPlugins
}
