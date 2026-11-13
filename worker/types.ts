export type WorkerBindings = {
  ADMIN_EMAILS?: string
  APP_ENVIRONMENT?: string
  APP_ORIGIN?: string
  ASSETS: Fetcher
  BETTER_AUTH_SECRET?: string
  EMAIL_PASSWORD_AUTH_ENABLED?: string
  DB: D1Database
  AI?: Ai
}

export type WorkerEnvironment = {
  Bindings: WorkerBindings
  Variables: {
    authenticatedUserId: string
  }
}
