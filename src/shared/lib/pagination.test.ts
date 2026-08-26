import { describe, expect, it, vi } from 'vitest'
import { collectPages } from './pagination'

describe('collectPages', () => {
  it('loads inclusive ranges until a short page is returned', async () => {
    const loadPage = vi
      .fn<(from: number, to: number) => Promise<readonly number[]>>()
      .mockResolvedValueOnce([1, 2])
      .mockResolvedValueOnce([3, 4])
      .mockResolvedValueOnce([5])

    await expect(collectPages(loadPage, 2)).resolves.toEqual([
      1, 2, 3, 4, 5,
    ])
    expect(loadPage.mock.calls).toEqual([
      [0, 1],
      [2, 3],
      [4, 5],
    ])
  })

  it('rejects invalid page sizes', async () => {
    await expect(collectPages(async () => [], 0)).rejects.toThrow(
      'Page size must be a positive integer.',
    )
  })
})
