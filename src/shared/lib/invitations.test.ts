import { describe, expect, it } from 'vitest'
import { createInviteLink, extractInviteToken } from './invitations'

describe('extractInviteToken', () => {
  it.each([
    ['friend-token', 'friend-token'],
    ['https://study.example/?circle=friend-token', 'friend-token'],
    ['https://study.example/#circle=friend-token', 'friend-token'],
    ['https://study.example/invite/friend-token', 'friend-token'],
  ])('extracts a token from %s', (value, expected) => {
    expect(extractInviteToken(value)).toBe(expected)
  })
})

describe('createInviteLink', () => {
  it('keeps the token out of the server-visible query string', () => {
    expect(createInviteLink('https://study.example/', 'friend token')).toBe(
      'https://study.example/#circle=friend%20token',
    )
  })
})
