import { describe, expect, it } from 'vitest'
import { generateTemporaryPassword } from '../routes/admin'
import { avatarPath, detectAvatarType } from './avatar'

describe('profile pictures', () => {
  it('detects real image bytes and rejects everything else', () => {
    expect(detectAvatarType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))).toBe('image/png')
    expect(detectAvatarType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg')
    expect(detectAvatarType(new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50]))).toBe('image/webp')
    expect(detectAvatarType(new TextEncoder().encode('<svg onload="alert(1)">'))).toBeNull()
    expect(detectAvatarType(new Uint8Array())).toBeNull()
  })

  it('versions picture URLs so caches refresh after a change', () => {
    expect(avatarPath('abc', 42)).toBe('/api/avatars/abc?v=42')
  })
})

describe('admin password reset', () => {
  it('makes readable, long-enough temporary passwords', () => {
    const seen = new Set<string>()
    for (let index = 0; index < 50; index += 1) {
      const password = generateTemporaryPassword()
      expect(password).toMatch(/^[a-zA-Z2-9]{4}-[a-zA-Z2-9]{4}-[a-zA-Z2-9]{4}$/)
      expect(password).not.toMatch(/[01OIl]/)
      expect(password.length).toBeGreaterThanOrEqual(10)
      seen.add(password)
    }
    expect(seen.size).toBe(50)
  })
})
