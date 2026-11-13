import { lazy, Suspense } from 'react'
import ErrorBoundary from './ErrorBoundary'
import ApplicationProviders from './ApplicationProviders'

const App = lazy(() => import('../App'))
const PwaUpdatePrompt = import.meta.env.PROD
  ? lazy(() => import('./pwa/PwaUpdatePrompt'))
  : null

export default function ApplicationRoot() {
  return (
    <ErrorBoundary>
      <ApplicationProviders>
        <Suspense
          fallback={
            <main className="grid min-h-dvh place-items-center text-sm text-muted-foreground" aria-live="polite">
              <div className="flex flex-col items-center gap-5">
                <span aria-hidden className="size-14 animate-pulse rounded-[1.3rem] bg-primary shadow-[var(--glow-primary)] motion-reduce:animate-none" />
                در حال بارگذاری برنامه...
              </div>
            </main>
          }
        >
          <App />
        </Suspense>
        {PwaUpdatePrompt && <Suspense fallback={null}><PwaUpdatePrompt /></Suspense>}
      </ApplicationProviders>
    </ErrorBoundary>
  )
}
