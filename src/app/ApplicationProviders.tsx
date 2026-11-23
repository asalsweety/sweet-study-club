import {
  QueryClient,
  QueryClientProvider,
  QueryCache,
  MutationCache,
  onlineManager,
} from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'
import { BrowserRouter, useLocation } from 'react-router-dom'
import { ApiClientError } from '../shared/api/api-client-error'
import { offlineAccountKey } from '../shared/api/offline-cache'
import { canReachApi } from '../shared/api/reachability'
import { subscribeToConnection } from './pwa/online-status'
import { http } from '../shared/api/http'

type ApplicationProvidersProps = {
  children: ReactNode
}

function shouldRetryQuery(failureCount: number, error: Error) {
  if (failureCount >= 1) return false
  if (error instanceof ApiClientError && error.code === 'OFFLINE_NOT_CACHED') return false

  return (
    !(error instanceof ApiClientError) ||
    error.status === undefined ||
    error.status >= 500
  )
}

function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [pathname])

  return null
}

export default function ApplicationProviders({
  children,
}: ApplicationProvidersProps) {
  const [queryClient] = useState(
    () => {
      const recheckSession = (error: Error) => {
        if (error instanceof ApiClientError && (error.status === 401 || error.code === 'ACCOUNT_CHANGED')) {
          void client.invalidateQueries({ queryKey: ['session'] })
        }
      }
      const client = new QueryClient({
        queryCache: new QueryCache({ onError: recheckSession }),
        mutationCache: new MutationCache({ onError: recheckSession }),
        defaultOptions: {
          queries: {
            networkMode: 'always',
            retry: shouldRetryQuery,
            staleTime: 30_000,
          },
          mutations: {
            retry: false,
          },
        },
      })
      return client
    },
  )
  useEffect(() => {
    const handleAccountChange = (event: StorageEvent) => {
      if (event.key === offlineAccountKey || event.key === null) {
        const accountId = (value: string | null) => {
          try { return JSON.parse(value ?? 'null')?.user?.id } catch { return undefined }
        }
        if (event.key === null || accountId(event.oldValue) !== accountId(event.newValue)) window.location.reload()
      }
    }
    window.addEventListener('storage', handleAccountChange)
    return () => window.removeEventListener('storage', handleAccountChange)
  }, [])
  useEffect(() => {
    onlineManager.setEventListener((setOnline) => {
      let probe: number | undefined
      let pending = false
      const check = () => {
        if (canReachApi() || !navigator.onLine || pending || document.visibilityState !== 'visible') return
        pending = true
        void http('GET', '/api/health', null).catch(() => {}).finally(() => { pending = false })
      }
      const sync = () => {
        const online = canReachApi()
        setOnline(online)
        window.clearInterval(probe)
        if (!online) probe = window.setInterval(check, 15_000)
      }
      const unsubscribe = subscribeToConnection(sync)
      window.addEventListener('online', check)
      document.addEventListener('visibilitychange', check)
      sync()
      return () => {
        unsubscribe()
        window.clearInterval(probe)
        window.removeEventListener('online', check)
        document.removeEventListener('visibilitychange', check)
      }
    })
    return () => onlineManager.setEventListener(() => undefined)
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ScrollToTop />
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  )
}
