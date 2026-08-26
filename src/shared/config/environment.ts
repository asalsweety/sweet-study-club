export const REQUIRED_PUBLIC_ENVIRONMENT_VARIABLES = [
  'VITE_PUBLIC_APP_URL',
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
] as const

export type PublicEnvironmentVariable =
  (typeof REQUIRED_PUBLIC_ENVIRONMENT_VARIABLES)[number]

type PublicEnvironment = Partial<
  Record<PublicEnvironmentVariable, string | undefined>
>

export function findMissingEnvironmentVariables(
  environment: PublicEnvironment,
) {
  return REQUIRED_PUBLIC_ENVIRONMENT_VARIABLES.filter(
    (variableName) => !environment[variableName]?.trim(),
  )
}

export const missingEnvironmentVariables =
  findMissingEnvironmentVariables({
    VITE_PUBLIC_APP_URL: import.meta.env.VITE_PUBLIC_APP_URL,
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_PUBLISHABLE_KEY:
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  })
