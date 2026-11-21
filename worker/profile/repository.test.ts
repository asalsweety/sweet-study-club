import { describe, expect, it, vi } from 'vitest'
import {
  findProfileByUserId,
  updateProfileByUserId,
} from './repository'

const profileRow = {
  id: 'user-123',
  email: 'learner@example.com',
  displayName: 'Ada Learner',
  avatarUrl: null,
  verified: 1,
  role: 'member',
  theme: 'system',
}

describe('profile repository', () => {
  it('loads only the requested user profile', async () => {
    const first = vi.fn(async () => profileRow)
    const bind = vi.fn(() => ({ first }))
    const prepare = vi.fn(() => ({ bind }))
    const database = { prepare } as unknown as D1Database

    await expect(
      findProfileByUserId(database, 'user-123'),
    ).resolves.toEqual({ ...profileRow, verified: true })

    expect(prepare).toHaveBeenCalledWith(
      expect.stringContaining('WHERE id = ?'),
    )
    expect(bind).toHaveBeenCalledWith('user-123')
  })

  it('updates allowed fields and scopes the write to the user ID', async () => {
    const run = vi.fn(async () => ({ success: true }))
    const updateBind = vi.fn(() => ({ run }))
    const first = vi.fn(async () => ({
      ...profileRow,
      displayName: 'Ada Updated',
      theme: 'dark',
    }))
    const selectBind = vi.fn(() => ({ first }))
    const prepare = vi.fn((sql: string) =>
      sql.trimStart().startsWith('UPDATE')
        ? { bind: updateBind }
        : { bind: selectBind },
    )
    const database = { prepare } as unknown as D1Database

    await expect(
      updateProfileByUserId(database, 'user-123', {
        displayName: 'Ada Updated',
        theme: 'dark',
      }),
    ).resolves.toMatchObject({
      displayName: 'Ada Updated',
      theme: 'dark',
    })

    expect(prepare.mock.calls[0]?.[0]).toContain('name = ?')
    expect(prepare.mock.calls[0]?.[0]).toContain('theme = ?')
    expect(prepare.mock.calls[0]?.[0]).toContain('WHERE id = ?')
    expect(updateBind).toHaveBeenCalledWith(
      'Ada Updated',
      'dark',
      expect.any(Number),
      'user-123',
    )
    expect(selectBind).toHaveBeenCalledWith('user-123')
  })

  it('returns null when no matching profile exists', async () => {
    const first = vi.fn(async () => null)
    const bind = vi.fn(() => ({ first }))
    const database = {
      prepare: vi.fn(() => ({ bind })),
    } as unknown as D1Database

    await expect(
      findProfileByUserId(database, 'missing-user'),
    ).resolves.toBeNull()
  })
})
