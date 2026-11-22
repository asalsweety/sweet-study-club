import { afterEach, expect, it, vi } from 'vitest'
import { acknowledgeNotice, hasSeenNotice, noticeKey } from './acknowledgement'

afterEach(() => vi.unstubAllGlobals())

it('shares dismissal of the same revision with the live site, scoped to this user and broadcast', () => {
  const storage = new Map<string, string>()
  vi.stubGlobal('localStorage', { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) })
  storage.set('sweetstudy:notice:ack:one%3Atwo:migration', '1')
  expect(hasSeenNotice('one:two', 'migration', 1)).toBe(true)
  expect(hasSeenNotice('one:two', 'migration', 2)).toBe(false)
  expect(hasSeenNotice('other', 'migration', 1)).toBe(false)
  expect(hasSeenNotice('one:two', 'another', 1)).toBe(false)
  acknowledgeNotice('one:two', 'migration', 2)
  acknowledgeNotice('one:two', 'migration', 1)
  expect(storage.get(noticeKey('one:two', 'migration'))).toBe('2')
})

it('can close a notice when the browser blocks storage', () => {
  vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } })
  expect(hasSeenNotice('private', 'migration', 1)).toBe(false)
  acknowledgeNotice('private', 'migration', 1)
  expect(hasSeenNotice('private', 'migration', 1)).toBe(true)
})
