import { lazy, Suspense } from 'react'
import ErrorBoundary from './ErrorBoundary'
import ApplicationProviders from './ApplicationProviders'
import PwaUpdatePrompt from './pwa/PwaUpdatePrompt'

const App = lazy(() => import('../App'))

export default function ApplicationRoot() {
  return (
    <ErrorBoundary>
      <ApplicationProviders>
        <Suspense
          fallback={
            <main className="grid min-h-dvh place-items-center bg-background text-sm text-muted-foreground" aria-live="polite">
              در حال بارگذاری برنامه...
            </main>
          }
        >
          <App />
        </Suspense>
        <PwaUpdatePrompt />
      </ApplicationProviders>
    </ErrorBoundary>
  )
}
