import { describe, expect, it } from 'vitest'
import { findMissingEnvironmentVariables } from './environment'

describe('findMissingEnvironmentVariables', () => {
  it('returns empty and whitespace-only required values', () => {
    expect(
      findMissingEnvironmentVariables({
        VITE_PUBLIC_APP_URL: ' ',
        VITE_SUPABASE_URL: 'https://project.supabase.co',
      }),
    ).toEqual([
      'VITE_PUBLIC_APP_URL',
      'VITE_SUPABASE_PUBLISHABLE_KEY',
    ])
  })

  it('accepts a complete browser-safe configuration', () => {
    expect(
      findMissingEnvironmentVariables({
        VITE_PUBLIC_APP_URL: 'http://localhost:5173',
        VITE_SUPABASE_URL: 'https://project.supabase.co',
        VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example',
      }),
    ).toEqual([])
  })
})
