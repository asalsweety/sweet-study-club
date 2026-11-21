import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { existsSync, readdirSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { lucideImports } from './scripts/lucide-imports.ts'

export default defineConfig(async ({ command, mode }) => {
  const titleFont = '/fonts/licensed/mahboubeh-mehravar.woff2'
  const includeTitleFont = (command === 'serve' || process.env.VITE_TITLE_FONT_LICENSED === 'true')
    && existsSync(resolve('public', titleFont.slice(1)))
  // Tests and ordinary UI edits do not need to load Workbox's build toolchain.
  const runtimePlugins = mode === 'test'
    ? []
    : (await import('@cloudflare/vite-plugin')).cloudflare()
  const buildPlugins = command === 'build' && mode !== 'test'
    ? (await import('./scripts/pwa.ts')).pwaPlugins()
    : []

  return {
    plugins: [
      lucideImports(), react(), tailwindcss(), ...buildPlugins, ...runtimePlugins,
      {
        name: 'self-hosted-title-font',
        transformIndexHtml: {
          order: 'pre',
          handler() {
            const href = includeTitleFont ? titleFont : '/node_modules/@fontsource/lalezar/files/lalezar-arabic-400-normal.woff2'
            const preload = { tag: 'link', attrs: { rel: 'preload', as: 'font', href, type: 'font/woff2', crossorigin: '' } }
            if (!includeTitleFont) return [preload]
            return [
              preload,
              { tag: 'style', children: `@font-face{font-family:"Mahboubeh Mehravar";src:url(${titleFont}) format("woff2");font-display:swap}` },
            ]
          },
        },
      },
      {
        name: 'exclude-local-worker-secrets',
        apply: 'build' as const,
        closeBundle() {
          // Keep this after Cloudflare's build hooks: local preview secrets
          // must never remain in deployment artifacts.
          for (const entry of readdirSync(resolve('dist'), { withFileTypes: true })) {
            if (entry.isDirectory()) {
              rmSync(resolve('dist', entry.name, '.dev.vars'), { force: true })
            }
          }
          // The owner's font is only distributed with explicitly enabled builds.
          if (!includeTitleFont) {
            rmSync(resolve('dist', 'client', 'fonts', 'licensed'), { recursive: true, force: true })
          }
        },
      },
    ],
    resolve: {
      alias: { '@': resolve(import.meta.dirname, './src') },
    },
    optimizeDeps: {
      entries: ['index.html'],
      // This build-only virtual module is behind import.meta.env.PROD. The
      // scanner still encounters its source when following lazy imports.
      exclude: command === 'serve' ? ['virtual:pwa-register/react'] : [],
    },
    server: {
      watch: { ignored: ['**/.wrangler/**', '**/.kiro/**', '**/apps/**'] },
    },
    test: {
      // apps/* are separate projects with their own (node:test) runners.
      exclude: ['**/node_modules/**', '**/dist/**', 'apps/**', '.wrangler/**'],
    },
  }
})
