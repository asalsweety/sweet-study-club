export function extractInviteToken(value: string) {
  const trimmedValue = value.trim()

  if (!trimmedValue) return ''

  try {
    const url = new URL(trimmedValue)
    const hashParameters = new URLSearchParams(url.hash.slice(1))

    return (
      url.searchParams.get('circle') ??
      hashParameters.get('circle') ??
      url.pathname.split('/').filter(Boolean).pop() ??
      ''
    )
  } catch {
    const tokenSegment = trimmedValue
      .replace(/^.*(?:[?&#]circle=)/i, '')
      .split(/[&#]/)[0]

    return (tokenSegment ?? '').trim().toLowerCase()
  }
}

export function createInviteLink(publicAppUrl: string, inviteToken: string) {
  const normalizedAppUrl = publicAppUrl.replace(/\/$/, '')

  return `${normalizedAppUrl}/#circle=${encodeURIComponent(inviteToken)}`
}
