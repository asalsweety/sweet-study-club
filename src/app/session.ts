import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { auth, type AuthSession } from './auth'

const loadApi = () => import('./api').then((module) => module.api)

export const queryKeys = {
  session: ['session'] as const,
  profile: ['profile'] as const,
  settings: ['settings'] as const,
  subjects: ['subjects'] as const,
  timer: ['timer'] as const,
  schedule: (date: string) => ['schedule', date] as const,
  planner: (from: string, to: string) => ['planner', from, to] as const,
  reminders: ['reminders'] as const,
  progress: (period: string) => ['progress', period] as const,
  heatmap: ['heatmap'] as const,
  gamification: ['gamification'] as const,
  dna: ['dna'] as const,
  friends: ['friends'] as const,
  live: (scope: string) => ['live', scope] as const,
  leaderboard: (period: string, scope: string) => ['leaderboard', period, scope] as const,
  cheers: ['cheers'] as const,
  shop: ['shop'] as const,
  chibi: ['chibi'] as const,
  orders: ['orders'] as const,
  entitlements: ['entitlements'] as const,
  planRequests: ['plan-requests'] as const,
  broadcasts: ['broadcasts'] as const,
}

export function useSession() {
  return useQuery({ queryKey: queryKeys.session, queryFn: auth.session, staleTime: 5 * 60_000 })
}

export function useProfile(enabled = true) {
  return useQuery({ queryKey: queryKeys.profile, queryFn: async () => (await loadApi()).profile.get(), enabled })
}

export function useSettings(enabled = true) {
  return useQuery({ queryKey: queryKeys.settings, queryFn: async () => (await loadApi()).settings.get(), enabled })
}

export function useSubjects(enabled = true) {
  return useQuery({ queryKey: queryKeys.subjects, queryFn: async () => (await loadApi()).subjects.list(), enabled, staleTime: 5 * 60_000 })
}

export function useEntitlements(enabled = true) {
  return useQuery({ queryKey: queryKeys.entitlements, queryFn: async () => (await loadApi()).shop.entitlements(), enabled })
}

export function useChibi(enabled = true) {
  return useQuery({ queryKey: queryKeys.chibi, queryFn: async () => (await loadApi()).shop.chibi(), enabled })
}

export function useSignOut() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: () => endSession(client),
  })
}

export async function endSession(client: QueryClient) {
  await auth.signOut()
  await replaceSession(client, null)
}

export async function replaceSession(client: QueryClient, session: AuthSession | null) {
  await client.cancelQueries()
  // Keep the observed session query alive. Removing it detaches App's observer,
  // so writing a new query with the same key would not update the visible UI.
  client.removeQueries({ predicate: (query) => query.queryKey[0] !== queryKeys.session[0] })
  client.setQueryData(queryKeys.session, session)
}

/** Refresh everything that a finished or changed study session affects. */
export function invalidateStudyData(client: ReturnType<typeof useQueryClient>) {
  for (const key of [['timer'], ['progress'], ['heatmap'], ['gamification'], ['dna'], ['leaderboard'], ['live'], ['friends'], queryKeys.chibi]) {
    void client.invalidateQueries({ queryKey: key })
  }
}
