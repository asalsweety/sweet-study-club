import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readdirSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { lucideImports } from './scripts/lucide-imports.ts'

export default defineConfig(async ({ command, mode }) => {
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
          // The commercial title font may only be served once its website
          // license is bought (see src/app/titleFont.ts).
          if (process.env.VITE_TITLE_FONT_LICENSED !== 'true') {
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
      exclude: ['**/node_modules/**', '**/dist/**', 'apps/**'],
    },
  }
})
