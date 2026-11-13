import { afterEach, describe, expect, it, vi } from 'vitest'
import forwarder from '../deployment/domain-forwarder.mjs'

const publicOrigin = 'https://test.zendegidarkhavarmiane.lol'
const upstreamOrigin = 'https://sweet-study-club-test.asal-aboali.workers.dev'

afterEach(() => vi.unstubAllGlobals())

describe('domain account forwarding Worker', () => {
  it('preserves authenticated POST requests and the browser origin', async () => {
    const upstream = vi.fn(async (request) => {
      expect(request.url).toBe(`${upstreamOrigin}/api/planner?date=2026-10-15`)
      expect(request.method).toBe('POST')
      expect(request.redirect).toBe('manual')
      expect(request.headers.get('Origin')).toBe(publicOrigin)
      expect(request.headers.get('Cookie')).toBe('session=private')
      expect(request.headers.get('X-Forwarded-Host')).toBe('test.zendegidarkhavarmiane.lol')
      expect(await request.json()).toEqual({ title: 'Study chemistry' })
      return new Response('{}', { status: 201 })
    })
    vi.stubGlobal('fetch', upstream)
    const result = await forwarder.fetch(new Request(`${publicOrigin}/api/planner?date=2026-10-15`, {
      method: 'POST',
      headers: { Origin: publicOrigin, Cookie: 'session=private', 'Content-Type': 'application/json', 'X-Forwarded-Host': 'spoofed.example' },
      body: JSON.stringify({ title: 'Study chemistry' }),
    }))
    expect(result.status).toBe(201)
    expect(result.headers.get('Cache-Control')).toBe('private, no-store')
  })

  it('preserves separate auth cookies and rewrites upstream redirects to the public host', async () => {
    const headers = new Headers({ Location: `${upstreamOrigin}/planner?return=1` })
    headers.append('Set-Cookie', '__Secure-sweet-study.session_token=one; Path=/; HttpOnly; Secure; SameSite=Lax')
    headers.append('Set-Cookie', '__Secure-sweet-study.session_data=two; Path=/; HttpOnly; Secure; SameSite=Lax')
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 302, headers })))
    const result = await forwarder.fetch(new Request(`${publicOrigin}/api/auth/callback`))
    expect(result.status).toBe(302)
    expect(result.headers.get('Location')).toBe(`${publicOrigin}/planner?return=1`)
    expect(result.headers.getSetCookie()).toEqual(headers.getSetCookie())
  })

  it('keeps a double-slash path on the fixed upstream rather than creating an open proxy', async () => {
    vi.stubGlobal('fetch', vi.fn(async (request) => {
      expect(new URL(request.url).origin).toBe(upstreamOrigin)
      expect(new URL(request.url).pathname).toBe('//attacker.example/path')
      return new Response('asset')
    }))
    expect((await forwarder.fetch(new Request(`${publicOrigin}//attacker.example/path`))).status).toBe(200)
  })

  it('resolves relative redirects against the requested path', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 302, headers: { Location: '?after=1' } })))
    const result = await forwarder.fetch(new Request(`${publicOrigin}/planner?before=1`))
    expect(result.headers.get('Location')).toBe(`${publicOrigin}/planner?after=1`)
  })

  it('redirects HTTP to HTTPS without sending a request upstream', async () => {
    const upstream = vi.fn()
    vi.stubGlobal('fetch', upstream)
    const result = await forwarder.fetch(new Request('http://test.zendegidarkhavarmiane.lol/planner?day=1'))
    expect(result.status).toBe(308)
    expect(result.headers.get('Location')).toBe(`${publicOrigin}/planner?day=1`)
    expect(upstream).not.toHaveBeenCalled()
  })

  it('rejects unrelated public hostnames', async () => {
    const upstream = vi.fn()
    vi.stubGlobal('fetch', upstream)
    expect((await forwarder.fetch(new Request('https://unrelated.example/api/profile'))).status).toBe(404)
    expect(upstream).not.toHaveBeenCalled()
  })

  it('returns a private generic error when the upstream fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('Internal connection details') }))
    const result = await forwarder.fetch(new Request(`${publicOrigin}/api/profile`))
    expect(result.status).toBe(502)
    expect(result.headers.get('Cache-Control')).toBe('no-store')
    expect(await result.text()).not.toContain('Internal connection details')
  })
})
