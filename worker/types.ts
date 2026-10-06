export type WorkerBindings = {
  ADMIN_EMAILS?: string
  APP_ENVIRONMENT?: string
  APP_ORIGIN?: string
  ASSETS: Fetcher
  BETTER_AUTH_SECRET?: string
  DB: D1Database
}

export type WorkerEnvironment = {
  Bindings: WorkerBindings
  Variables: {
    authenticatedUserId: string
  }
}
