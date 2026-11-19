import { VitePWA } from 'vite-plugin-pwa'

export function pwaPlugins() {
  const pwaPlugins = VitePWA({
    registerType: 'prompt',
    includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
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
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      ],
      shortcuts: [
        { name: 'شروع مطالعه', short_name: 'مطالعه', url: '/', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
        { name: 'پلنر', url: '/planner', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
        { name: 'دوستان و مطالعه‌ی زنده', short_name: 'دوستان', url: '/friends', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      ],
    },
    workbox: {
      cleanupOutdatedCaches: true,
      globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      globIgnores: [
        '**/html2canvas-*.js',
        '**/purify*.js',
        '**/images/**',
        // The title font is precached only in builds that ship it.
        ...(process.env.VITE_TITLE_FONT_LICENSED === 'true' ? [] : ['**/fonts/licensed/**']),
      ],
      navigateFallback: '/index.html',
      navigateFallbackDenylist: [/^\/api\//],
    },
  })

  for (const plugin of pwaPlugins) {
    plugin.applyToEnvironment = (environment) =>
      environment.name === 'client'
  }

  return pwaPlugins
}
