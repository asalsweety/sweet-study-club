import { lazy, Suspense } from 'react'
import { missingEnvironmentVariables } from '../shared/config/environment'
import ConfigurationError from './ConfigurationError'
import ErrorBoundary from './ErrorBoundary'
import ApplicationProviders from './ApplicationProviders'
import PwaUpdatePrompt from './pwa/PwaUpdatePrompt'

const App = lazy(() => import('../App'))

export default function ApplicationRoot() {
  if (missingEnvironmentVariables.length > 0) {
    return (
      <ConfigurationError
        missingVariables={missingEnvironmentVariables}
      />
    )
  }

  return (
    <ErrorBoundary>
      <ApplicationProviders>
        <Suspense
          fallback={
            <main className="startup-status" aria-live="polite">
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
