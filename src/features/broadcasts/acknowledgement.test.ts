import { afterEach, expect, it, vi } from 'vitest'
import packageInfo from '../../../package.json'
import { acknowledgeNotice, acknowledgeRelease, hasReadRelease, hasSeenNotice, noticeKey, pendingGuestRelease } from './acknowledgement'
import { releaseNote } from './release-note'

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

it('carries a guest release acknowledgement into the first sign-in and still offers the update to another account', () => {
  const id = releaseNote.id
  expect(releaseNote.version).toBe(packageInfo.version)
  expect(id).toBe(`release:v${packageInfo.version}`)
  expect(releaseNote.name).toBe(`Sweet Study v${packageInfo.version}`)
  expect(hasReadRelease(null, id)).toBe(false)
  acknowledgeRelease(null, id)
  expect(hasReadRelease(null, id)).toBe(true)
  expect(hasReadRelease('first-member', id)).toBe(true)
  expect(pendingGuestRelease(id)).toBe(true)
  acknowledgeRelease('first-member', id)
  expect(pendingGuestRelease(id)).toBe(false)
  expect(hasReadRelease('first-member', id)).toBe(true)
  expect(hasReadRelease('second-member', id)).toBe(false)
  expect(hasReadRelease('first-member', 'release:next')).toBe(false)
})

it('preserves a signed-in acknowledgement when returning to login without marking other accounts as read', () => {
  const id = 'release:member-first'
  acknowledgeRelease('first-member', id)
  expect(hasReadRelease(null, id)).toBe(true)
  expect(hasReadRelease('first-member', id)).toBe(true)
  expect(hasReadRelease('second-member', id)).toBe(false)
})
