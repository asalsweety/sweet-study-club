import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToReadableStream } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { ApiClientError } from '../shared/api/api-client-error'
import App from '../App'
const state = vi.hoisted(() => ({
  session: {} as Record<string, unknown>,
  profile: {} as Record<string, unknown>,
  prefetchStudy: vi.fn(),
  settings: vi.fn((_enabled: boolean) => ({ isPending: false, data: { educationGroup: 'school', educationStage: 'tajrobi' } })),
}))
vi.mock('./session', () => ({
  useSession: () => state.session,
  useProfile: () => state.profile,
  usePrefetchStudyData: state.prefetchStudy,
  useSettings: state.settings,
}))
vi.mock('../components/AppShell', () => ({ default: ({ children }: { children: React.ReactNode }) => <div data-testid="workspace">{children}</div> }))
vi.mock('../features/auth/AuthScreen', () => ({ default: () => <h1>Account entry</h1> }))
vi.mock('../features/presence/BackgroundServices', () => ({ default: () => null }))
vi.mock('../pages/HomePage', () => ({ default: () => <h1>Today workspace</h1> }))
vi.mock('../pages/LearningPage', () => ({ default: () => <h1>Learning destination</h1> }))
vi.mock('../pages/OfflineLearningPage', () => ({ default: () => <h1>Offline library</h1> }))
const member = { id: 'one', displayName: 'Test', role: 'member' }
async function render(path = '/') {
  const stream = await renderToReadableStream(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>)
  await stream.allReady
  return new Response(stream).text()
}
beforeEach(() => {
  state.session = { isPending: false, isError: false, data: { user: { id: 'one' } } }
  state.profile = { isPending: false, isError: false, data: member }
})
describe('session-first routing', () => {
  it('opens the workspace directly without browser onboarding storage', async () => {
    expect(await render()).toContain('Today workspace')
  })
  it('keeps an authenticated deep-link destination', async () => {
    expect(await render('/learn?tab=notebook')).toContain('Learning destination')
  })
  it('uses one account entry for signed-out deep links', async () => {
    state.session = { isPending: false, data: null }
    expect(await render('/learn?tab=notebook')).toContain('Account entry')
  })
  it('opens the offline library without waiting for a session', async () => {
    state.session = { isPending: true }
    expect(await render('/offline')).toContain('Offline library')
  })
  it('starts settings and pixel-room data while the signed-in profile is loading', async () => {
    state.profile = { isPending: true, data: undefined }
    await render('/focus?room=pixel')
    expect(state.settings).toHaveBeenLastCalledWith(true)
    expect(state.prefetchStudy).toHaveBeenLastCalledWith(true, true)
  })
  it('keeps account and room requests disabled until the session is known', async () => {
    state.session = { isPending: true, data: undefined }
    await render('/focus?room=pixel')
    expect(state.settings).toHaveBeenLastCalledWith(false)
    expect(state.prefetchStudy).toHaveBeenLastCalledWith(false, true)
  })
  it('does not turn a connection error into a login screen', async () => {
    state.session = { isPending: false, isError: true, data: undefined }
    const html = await render()
    expect(html).toContain('اتصال برقرار نشد')
    expect(html).toContain('href="/offline"')
    expect(html).not.toContain('Account entry')
  })
  it('offers retry instead of spinning forever on profile failure', async () => {
    state.profile = { isError: true, data: undefined, error: new Error('offline') }
    expect(await render()).toContain('اطلاعات حسابت بارگذاری نشد')
  })
  it('returns to account entry on an expired session even with cached profile data', async () => {
    state.profile = { data: member, isError: true, error: new ApiClientError('expired', { code: 'UNAUTHORIZED', status: 401 }) }
    expect(await render()).toContain('Account entry')
  })
  it('redirects old onboarding links to the signed-in workspace', async () => {
    const html = await render('/onboarding')
    expect(html).toContain('data-testid="workspace"')
    expect(html).not.toContain('Account entry')
  })
})
