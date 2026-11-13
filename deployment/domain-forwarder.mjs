// Deploy this small Worker in the account that owns zendegidarkhavarmiane.lol.
// The application and its database remain in Asal's account.
const publicOrigin = 'https://test.zendegidarkhavarmiane.lol'
const upstreamOrigin = 'https://sweet-study-club-test.asal-aboali.workers.dev'

export default {
  async fetch(request) {
    const incoming = new URL(request.url)
    const publicUrl = new URL(publicOrigin)
    if (incoming.hostname !== publicUrl.hostname) {
      return new Response('Not found', { status: 404 })
    }
    if (incoming.protocol !== 'https:') {
      incoming.protocol = 'https:'
      incoming.port = ''
      return Response.redirect(incoming.toString(), 308)
    }

    const upstream = new URL(upstreamOrigin)
    // Assign the origin fields, rather than resolving a user-controlled path:
    // even a path beginning with // must stay on the fixed upstream host.
    const target = new URL(incoming)
    target.protocol = upstream.protocol
    target.host = upstream.host
    const outbound = new Request(target, new Request(request, { redirect: 'manual' }))
    outbound.headers.set('Host', upstream.host)
    outbound.headers.set('X-Forwarded-Host', publicUrl.host)
    outbound.headers.set('X-Forwarded-Proto', 'https')

    try {
      const result = await fetch(outbound)
      const response = new Response(result.body, result)
      const location = response.headers.get('Location')
      if (location) {
        const destination = new URL(location, target)
        if (destination.origin === upstream.origin) {
          destination.protocol = publicUrl.protocol
          destination.host = publicUrl.host
          response.headers.set('Location', destination.toString())
        }
      }
      if (incoming.pathname === '/api' || incoming.pathname.startsWith('/api/')) {
        response.headers.set('Cache-Control', 'private, no-store')
      }
      return response
    } catch {
      return new Response('The study app is temporarily unavailable.', {
        status: 502,
        headers: { 'Cache-Control': 'no-store' },
      })
    }
  },
}
