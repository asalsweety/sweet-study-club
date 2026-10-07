import { cloudflare } from '@cloudflare/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { rmSync } from 'node:fs'
import { resolve } from 'node:path'

export default defineConfig(({ mode }) => {
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
      background_color: '#fff8fb',
      theme_color: '#c95fb4',
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
      globPatterns: ['**/*.{js,css,html,svg,png}'],
      globIgnores: [
        '**/html2canvas-*.js',
        '**/purify*.js',
        '**/images/**',
      ],
      navigateFallback: '/index.html',
      navigateFallbackDenylist: [/^\/api\//],
    },
  })

  for (const plugin of pwaPlugins) {
    plugin.applyToEnvironment = (environment) =>
      environment.name === 'client'
  }

  const productionPlugins =
    mode === 'test'
      ? []
      : [
          ...pwaPlugins,
          cloudflare(),
          {
            name: 'exclude-local-worker-secrets',
            apply: 'build' as const,
            closeBundle() {
              // Cloudflare's generated deploy directory can inherit local
              // development secrets. Deployment artifacts must never keep them.
              rmSync(
                resolve('dist/sweet_study_club/.dev.vars'),
                { force: true },
              )
            },
          },
        ]

  return {
    plugins: [react(), tailwindcss(), ...productionPlugins],
    resolve: {
      alias: {
        '@': resolve(import.meta.dirname, './src'),
      },
    },
  }
})
