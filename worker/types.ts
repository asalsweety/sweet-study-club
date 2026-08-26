export type WorkerBindings = {
  APP_ENVIRONMENT?: string
  ASSETS: Fetcher
  DB: D1Database
}

export type WorkerEnvironment = {
  Bindings: WorkerBindings
}
