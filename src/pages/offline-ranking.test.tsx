import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { queryKeys } from '../app/session'
import { ApiClientError } from '../shared/api/api-client-error'
import RankingPage from './RankingPage'

vi.mock('../app/pwa/online-status', () => ({ useOnlineStatus: () => false }))

const key = queryKeys.leaderboard('week', 'everyone')
const saved = {
  period: 'week', scope: 'everyone', range: { from: '2026-11-21', to: '2026-11-27' },
  entries: [], me: null, optedIn: true,
}

function render(client: QueryClient) {
  return renderToStaticMarkup(<QueryClientProvider client={client}><MemoryRouter><RankingPage /></MemoryRouter></QueryClientProvider>)
}

async function failRead(client: QueryClient) {
  await expect(client.fetchQuery({
    queryKey: key,
    queryFn: () => Promise.reject(new ApiClientError('Missing on this device', { code: 'OFFLINE_NOT_CACHED' })),
  })).rejects.toThrow()
}

const clientOptions = { defaultOptions: { queries: { retry: false, refetchOnMount: false, retryOnMount: false } } }

describe('offline leaderboard', () => {
  it('distinguishes an unseen filter from a saved board with no entries', async () => {
    const client = new QueryClient(clientOptions)
    await failRead(client)
    expect(render(client)).toContain('جدول این بازه و گروه هنوز روی این دستگاه ذخیره نشده است')
    client.setQueryData(key, saved)
    expect(render(client)).toContain('هنوز مطالعه‌ای در این بازه ثبت نشده')
  })

  it('keeps the last visible standings after a failed refresh', async () => {
    const client = new QueryClient(clientOptions)
    client.setQueryData(key, { ...saved, entries: [{ userId: 'sample', displayName: 'دانش‌آموز آزمایشی', rank: 1, seconds: 120 }] })
    await failRead(client)
    const html = render(client)
    expect(html).toContain('دانش‌آموز آزمایشی')
    expect(html).toContain('آخرین جدول ذخیره‌شده')
  })
})
