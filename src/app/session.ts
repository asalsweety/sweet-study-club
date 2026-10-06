import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api'
import { auth } from './auth'

export const queryKeys = {
  session: ['session'] as const,
  profile: ['profile'] as const,
  settings: ['settings'] as const,
  subjects: ['subjects'] as const,
  timer: ['timer'] as const,
  schedule: (date: string) => ['schedule', date] as const,
  planner: (from: string, to: string) => ['planner', from, to] as const,
  progress: (period: string) => ['progress', period] as const,
  heatmap: ['heatmap'] as const,
  gamification: ['gamification'] as const,
  dna: ['dna'] as const,
  friends: ['friends'] as const,
  live: (scope: string) => ['live', scope] as const,
  leaderboard: (period: string, scope: string) => ['leaderboard', period, scope] as const,
  cheers: ['cheers'] as const,
  shop: ['shop'] as const,
  orders: ['orders'] as const,
  entitlements: ['entitlements'] as const,
  planRequests: ['plan-requests'] as const,
  broadcasts: ['broadcasts'] as const,
}

export function useSession() {
  return useQuery({ queryKey: queryKeys.session, queryFn: auth.session, staleTime: 5 * 60_000 })
}

export function useProfile(enabled = true) {
  return useQuery({ queryKey: queryKeys.profile, queryFn: api.profile.get, enabled })
}

export function useSettings(enabled = true) {
  return useQuery({ queryKey: queryKeys.settings, queryFn: api.settings.get, enabled })
}

export function useSubjects(enabled = true) {
  return useQuery({ queryKey: queryKeys.subjects, queryFn: api.subjects.list, enabled, staleTime: 5 * 60_000 })
}

export function useEntitlements(enabled = true) {
  return useQuery({ queryKey: queryKeys.entitlements, queryFn: api.shop.entitlements, enabled })
}

export function useSignOut() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: auth.signOut,
    onSettled: () => {
      client.clear()
      void client.invalidateQueries({ queryKey: queryKeys.session })
    },
  })
}

/** Refresh everything that a finished or changed study session affects. */
export function invalidateStudyData(client: ReturnType<typeof useQueryClient>) {
  for (const key of [['timer'], ['progress'], ['heatmap'], ['gamification'], ['dna'], ['leaderboard'], ['live'], ['friends']]) {
    void client.invalidateQueries({ queryKey: key })
  }
}
