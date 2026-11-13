import { afterEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryObserver } from '@tanstack/react-query'
import { auth } from './auth'
import { endSession, queryKeys, replaceSession } from './session'

afterEach(() => vi.unstubAllGlobals())
describe('account entry', () => {
  it('notifies the mounted session observer on login and logout', async () => {
    const client = new QueryClient()
    client.setQueryData(queryKeys.session, null)
    client.setQueryData(queryKeys.profile, { id: 'previous-account' })
    const observer = new QueryObserver(client, { queryKey: queryKeys.session, enabled: false })
    const received: unknown[] = []
    const unsubscribe = observer.subscribe((result) => received.push(result.data))
    const session = { user: { id: 'new-account', name: 'Test User', email: 'test@example.com' } }
    await replaceSession(client, session)
    expect(received.at(-1)).toEqual(session)
    expect(client.getQueryData(queryKeys.profile)).toBeUndefined()
    await replaceSession(client, null)
    expect(received.at(-1)).toBeNull()
    unsubscribe()
    client.clear()
  })
  it('translates Better Auth credential errors without exposing server messages', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ code: 'INVALID_EMAIL_OR_PASSWORD', message: 'internal detail' }, { status: 401 })))
    await expect(auth.signIn('test@example.com', 'incorrect')).rejects.toMatchObject({ code: 'INVALID_EMAIL_OR_PASSWORD', message: 'ایمیل یا رمز عبور درست نیست.' })
  })
  it('recognizes rate limits and preserves offline errors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({}, { status: 429 })))
    await expect(auth.signIn('test@example.com', 'password')).rejects.toMatchObject({ code: 'TOO_MANY_REQUESTS' })
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline') }))
    await expect(auth.session()).rejects.toMatchObject({ code: 'NETWORK_ERROR' })
  })
  it('treats only a rejected session as signed out', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({}, { status: 401 })))
    await expect(auth.session()).resolves.toBeNull()
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({}, { status: 503 })))
    await expect(auth.session()).rejects.toMatchObject({ status: 503 })
  })
  it('creates an account separately so a sign-in retry cannot create it twice', async () => {
    const fetcher = vi.fn(async () => Response.json({ user: { id: 'test' } }))
    vi.stubGlobal('fetch', fetcher)
    await auth.createAccount('Test User', 'test@example.com', 'password-1234')
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(fetcher).toHaveBeenCalledWith('/api/auth/sign-up/email', expect.objectContaining({ method: 'POST', credentials: 'include' }))
  })
  it('keeps the session and cached work when logout fails', async () => {
    const client = new QueryClient()
    client.setQueryData(queryKeys.session, { user: { id: 'one' } })
    client.setQueryData(queryKeys.timer, { subjectName: 'Physics' })
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline') }))
    await expect(endSession(client)).rejects.toMatchObject({ code: 'NETWORK_ERROR' })
    expect(client.getQueryData(queryKeys.session)).toEqual({ user: { id: 'one' } })
    expect(client.getQueryData(queryKeys.timer)).toEqual({ subjectName: 'Physics' })
    client.clear()
  })
  it('removes private cached data after successful logout', async () => {
    const client = new QueryClient()
    client.setQueryData(queryKeys.session, { user: { id: 'one' } })
    client.setQueryData(queryKeys.timer, { subjectName: 'Physics' })
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ success: true })))
    await endSession(client)
    expect(client.getQueryData(queryKeys.session)).toBeNull()
    expect(client.getQueryData(queryKeys.timer)).toBeUndefined()
    client.clear()
  })
})
