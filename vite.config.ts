import { cloudflare } from '@cloudflare/vite-plugin'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const pwaPlugins = VitePWA({
    registerType: 'prompt',
    includeAssets: ['favicon.svg'],
    manifest: {
      name: 'باشگاه مطالعه شیرین',
      short_name: 'Sweet Study',
      description: 'زمان مطالعه، پیشرفت و همراهی با دوستان',
      lang: 'fa',
      dir: 'rtl',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      background_color: '#fff8fb',
      theme_color: '#b94d82',
      icons: [
        {
          src: '/favicon.svg',
          sizes: 'any',
          type: 'image/svg+xml',
          purpose: 'any',
        },
      ],
    },
    workbox: {
      cleanupOutdatedCaches: true,
      globPatterns: ['**/*.{js,css,html,svg}'],
      globIgnores: [
        '**/html2canvas-*.js',
        '**/jspdf*.js',
        '**/purify*.js',
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
      : [...pwaPlugins, cloudflare()]

  return {
    plugins: [react(), ...productionPlugins],
  }
})
