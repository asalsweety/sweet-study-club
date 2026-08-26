import { Component, type ErrorInfo, type ReactNode } from 'react'

type ErrorBoundaryProps = {
  children: ReactNode
}

type ErrorBoundaryState = {
  failed: boolean
}

export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  override state: ErrorBoundaryState = { failed: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Keep diagnostics local until remote reporting has a privacy policy.
    console.error('Application rendering failed.', error, errorInfo)
  }

  override render() {
    if (this.state.failed) {
      return (
        <main className="startup-status" role="alert">
          <section>
            <p>یک خطای غیرمنتظره رخ داد</p>
            <h1>برنامه نتوانست این صفحه را نمایش دهد.</h1>
            <span>
              اتصال اینترنت را بررسی کنید و دوباره تلاش کنید.
            </span>
            <button type="button" onClick={() => window.location.reload()}>
              بارگذاری دوباره
            </button>
          </section>
        </main>
      )
    }

    return this.props.children
  }
}
