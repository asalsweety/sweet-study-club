import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'
import { BrowserRouter, useLocation } from 'react-router-dom'
import { ApiClientError } from '../shared/api/client'

type ApplicationProvidersProps = {
  children: ReactNode
}

function shouldRetryQuery(failureCount: number, error: Error) {
  if (failureCount >= 1) return false

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
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: shouldRetryQuery,
            staleTime: 30_000,
          },
          mutations: {
            retry: false,
          },
        },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ScrollToTop />
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  )
}
