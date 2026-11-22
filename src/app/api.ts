import { z } from 'zod'
import { chibiResponseSchema, type ChibiItemId, type ChibiUpdate } from '../shared/api/chibi'
import { del, get, http, patch, post, put } from '../shared/api/http'
import {
  createPlannerItemInputSchema,
  plannerItemResponseSchema,
  plannerItemsResponseSchema,
  type CreatePlannerItemInput,
  type UpdatePlannerItemInput,
} from '../shared/api/planner'
import { profileResponseSchema } from '../shared/api/profile'
import { sheetResponseSchema, sheetsResponseSchema, type CreateSheetInput, type UpdateSheetInput } from '../shared/api/sheets'
import {
  gamificationResponseSchema,
  heatmapResponseSchema,
  progressResponseSchema,
  studyDnaResponseSchema,
  type PeriodKind,
} from '../shared/api/progress'
import {
  dayScheduleResponseSchema,
  overridesResponseSchema,
  studyPartsResponseSchema,
  type CreateOverrideInput,
  type UpsertStudyPartInput,
} from '../shared/api/schedule'
import { settingsResponseSchema, subjectsResponseSchema, type UpdateSettingsInput, type UpsertSubjectInput } from '../shared/api/settings'
import {
  adminBroadcastsSchema,
  broadcastsSchema,
  adminProductsResponseSchema,
  entitlementsResponseSchema,
  orderResponseSchema,
  ordersResponseSchema,
  deliveryOrdersResponseSchema,
  type BroadcastInput,
  type Delivery,
  planRequestsResponseSchema,
  productsResponseSchema,
  type UpsertProductInput,
} from '../shared/api/shop'
import {
  cheersResponseSchema,
  friendsResponseSchema,
  inviteResponseSchema,
  leaderboardResponseSchema,
  liveResponseSchema,
} from '../shared/api/social'
import {
  stopTimerResponseSchema,
  studyLogListResponseSchema,
  studyTimerStateResponseSchema,
  type ManualStudyLogInput,
  type StartTimerInput,
  type StopTimerInput,
  type TimerCommandInput,
  type UpdateTimerInput,
} from '../shared/api/study-timer'

const timer = z.object({ timer: studyTimerStateResponseSchema.shape.timer.unwrap() })
const friendResult = friendsResponseSchema.extend({ status: z.enum(['pending', 'accepted']) })
const adminOverviewSchema = z.object({
  users: z.number(),
  activeToday: z.number(),
  studiedTodaySeconds: z.number(),
  revenueToman: z.number(),
  pendingPlanRequests: z.number(),
  studyingNow: z.number(),
})
const adminUsersSchema = z.object({
  users: z.array(
    z.object({
      id: z.string(),
      displayName: z.string(),
      email: z.string(),
      role: z.enum(['member', 'admin']),
      verified: z.boolean(),
      avatarUrl: z.string().nullable(),
      createdAt: z.number(),
      totalSeconds: z.number(),
      sessions: z.number(),
      lastSeenAt: z.number().nullable(),
    }),
  ),
  totals: z.object({ total: z.number(), admins: z.number(), verified: z.number(), newThisWeek: z.number() }),
})
export type AdminUser = z.infer<typeof adminUsersSchema>['users'][number]
const idSchema = z.object({ id: z.string() })
const query = (values: Record<string, string>) => `?${new URLSearchParams(values).toString()}`

export const api = {
  sheets: {
    list: () => get('/api/planner-sheets', sheetsResponseSchema).then((r) => r.sheets),
    get: (id: string) => get(`/api/planner-sheets/${encodeURIComponent(id)}`, sheetResponseSchema).then((r) => r.sheet),
    create: (input: CreateSheetInput) => post('/api/planner-sheets', sheetResponseSchema, input).then((r) => r.sheet),
    update: (id: string, input: UpdateSheetInput) => put(`/api/planner-sheets/${encodeURIComponent(id)}`, z.object({ updatedAt: z.number() }), input),
    remove: (id: string) => del(`/api/planner-sheets/${encodeURIComponent(id)}`, null),
  },
  profile: {
    get: () => get('/api/profile', profileResponseSchema).then((r) => r.profile),
    update: (input: { displayName?: string; theme?: 'light' | 'dark' | 'system' }) =>
      patch('/api/profile', profileResponseSchema, input).then((r) => r.profile),
    uploadAvatar: (picture: Blob) => put('/api/profile/avatar', profileResponseSchema, picture).then((r) => r.profile),
    removeAvatar: () => del('/api/profile/avatar', profileResponseSchema).then((r) => r.profile),
  },
  timer: {
    get: () => get('/api/study/timer', studyTimerStateResponseSchema).then((r) => r.timer),
    start: (input: StartTimerInput) => post('/api/study/timer/start', timer, input).then((r) => r.timer),
    pause: (input: TimerCommandInput) => post('/api/study/timer/pause', timer, input).then((r) => r.timer),
    resume: (input: TimerCommandInput) => post('/api/study/timer/resume', timer, input).then((r) => r.timer),
    update: (input: UpdateTimerInput) => patch('/api/study/timer', timer, input).then((r) => r.timer),
    stop: (input: StopTimerInput) => post('/api/study/timer/stop', stopTimerResponseSchema, input).then((r) => r.log),
    logs: (from: string, to: string) => get(`/api/study/logs${query({ from, to })}`, studyLogListResponseSchema).then((r) => r.logs),
    recordLog: (input: ManualStudyLogInput) => post('/api/study/logs', stopTimerResponseSchema, input).then((r) => r.log),
    removeLog: (id: string) => del(`/api/study/logs/${encodeURIComponent(id)}`, null),
  },
  schedule: {
    day: (date?: string) => get(`/api/schedule/day${date ? query({ date }) : ''}`, dayScheduleResponseSchema).then((r) => r.schedule),
  },
  settings: {
    get: () => get('/api/settings', settingsResponseSchema).then((r) => r.settings),
    update: (input: UpdateSettingsInput) => patch('/api/settings', settingsResponseSchema, input).then((r) => r.settings),
  },
  subjects: {
    list: () => get('/api/subjects', subjectsResponseSchema).then((r) => r.subjects),
    create: (input: UpsertSubjectInput) => post('/api/subjects', subjectsResponseSchema, input).then((r) => r.subjects),
    update: (id: string, input: UpsertSubjectInput) => put(`/api/subjects/${encodeURIComponent(id)}`, subjectsResponseSchema, input).then((r) => r.subjects),
    remove: (id: string) => del(`/api/subjects/${encodeURIComponent(id)}`, subjectsResponseSchema).then((r) => r.subjects),
    resetForProfile: () => post('/api/subjects/reset', subjectsResponseSchema, {}).then((r) => r.subjects),
  },
  planner: {
    list: (from: string, to: string) => get(`/api/planner${query({ from, to })}`, plannerItemsResponseSchema).then((r) => r.items),
    create: (input: CreatePlannerItemInput) =>
      post('/api/planner', plannerItemResponseSchema, createPlannerItemInputSchema.parse(input)).then((r) => r.item),
    update: (id: string, input: UpdatePlannerItemInput) =>
      patch(`/api/planner/${encodeURIComponent(id)}`, plannerItemResponseSchema, input).then((r) => r.item),
    remove: (id: string) => del(`/api/planner/${encodeURIComponent(id)}`, null),
    reminders: () => get('/api/planner/reminders', plannerItemsResponseSchema).then((r) => r.items),
  },
  progress: {
    period: (period: PeriodKind) => get(`/api/progress${query({ period })}`, progressResponseSchema),
    heatmap: (days = 140) => get(`/api/progress/heatmap${query({ days: String(days) })}`, heatmapResponseSchema).then((r) => r.days),
    gamification: () => get('/api/gamification', gamificationResponseSchema),
    markSeen: (badgeIds: string[], level: number) => post('/api/gamification/seen', null, { badgeIds, level }),
    dna: () => get('/api/study-dna', studyDnaResponseSchema).then((r) => r.dna),
  },
  social: {
    friends: () => get('/api/friends', friendsResponseSchema),
    addByCode: (friendCode: string) => post('/api/friends/by-code', friendResult, { friendCode }),
    createInvite: () => post('/api/friends/invites', inviteResponseSchema),
    acceptInvite: (token: string) => post('/api/friends/invites/accept', friendResult, { token }),
    respond: (userId: string, accept: boolean) => post('/api/friends/respond', friendsResponseSchema, { userId, accept }),
    remove: (userId: string) => post('/api/friends/remove', friendsResponseSchema, { userId }),
    block: (userId: string) => post('/api/friends/block', friendsResponseSchema, { userId }),
    unblock: (userId: string) => post('/api/friends/unblock', friendsResponseSchema, { userId }),
    live: (scope: 'friends' | 'everyone') => get(`/api/live${query({ scope })}`, liveResponseSchema),
    leaderboard: (period: PeriodKind, scope: 'friends' | 'everyone') =>
      get(`/api/leaderboard${query({ period, scope })}`, leaderboardResponseSchema),
    presence: () => post('/api/presence', null),
    cheers: () => get('/api/cheers', cheersResponseSchema).then((r) => r.cheers),
    cheer: (userId: string, emoji: '💖' | '🔥' | '👏' | '🌟' | '☕') => post('/api/cheers', null, { userId, emoji }),
    cheersSeen: () => post('/api/cheers/seen', null),
  },
  shop: {
    chibi: () => get('/api/shop/chibi', chibiResponseSchema),
    updateChibi: (input: ChibiUpdate) => patch('/api/shop/chibi', chibiResponseSchema, input),
    buyChibiItem: (item: ChibiItemId) => post('/api/shop/chibi/purchases', chibiResponseSchema, { item }),
    products: () => get('/api/shop/products', productsResponseSchema),
    orders: () => get('/api/shop/orders', ordersResponseSchema).then((r) => r.orders),
    order: (productId: string, idempotencyKey: string, delivery?: Delivery) =>
      post('/api/shop/orders', orderResponseSchema, { productId, idempotencyKey, ...(delivery ? { delivery } : {}) }).then((r) => r.order),
    devPay: (orderId: string) => post(`/api/shop/orders/${encodeURIComponent(orderId)}/dev-pay`, orderResponseSchema).then((r) => r.order),
    entitlements: () => get('/api/shop/entitlements', entitlementsResponseSchema),
    planRequests: () => get('/api/shop/plan-requests', planRequestsResponseSchema).then((r) => r.requests),
    requestPlan: (goal: string, details: string) =>
      post('/api/shop/plan-requests', planRequestsResponseSchema, { goal, details }).then((r) => r.requests),
    broadcasts: () => get('/api/broadcasts', broadcastsSchema).then((r) => r.broadcasts),
  },
  admin: {
    overview: () => get('/api/admin/overview', adminOverviewSchema),
    users: (q = '') => get(`/api/admin/users${query({ q })}`, adminUsersSchema),
    setRole: (id: string, role: 'member' | 'admin') => post(`/api/admin/users/${encodeURIComponent(id)}/role`, null, { role }),
    setVerified: (id: string, verified: boolean) => post(`/api/admin/users/${encodeURIComponent(id)}/verified`, null, { verified }),
    resetPassword: (id: string) =>
      post(`/api/admin/users/${encodeURIComponent(id)}/reset-password`, z.object({ temporaryPassword: z.string() }), {}).then((r) => r.temporaryPassword),
    signOutUser: (id: string) => post(`/api/admin/users/${encodeURIComponent(id)}/sign-out`, null, {}),
    removeAvatar: (id: string) => del(`/api/admin/users/${encodeURIComponent(id)}/avatar`, null),
    parts: () => get('/api/admin/parts', studyPartsResponseSchema).then((r) => r.parts),
    createPart: (input: UpsertStudyPartInput) => post('/api/admin/parts', studyPartsResponseSchema, input).then((r) => r.parts),
    updatePart: (id: string, input: UpsertStudyPartInput) =>
      put(`/api/admin/parts/${encodeURIComponent(id)}`, studyPartsResponseSchema, input).then((r) => r.parts),
    deletePart: (id: string) => del(`/api/admin/parts/${encodeURIComponent(id)}`, studyPartsResponseSchema).then((r) => r.parts),
    overrides: (from: string, to: string) => get(`/api/admin/overrides${query({ from, to })}`, overridesResponseSchema).then((r) => r.overrides),
    createOverride: (input: CreateOverrideInput) => post('/api/admin/overrides', idSchema, input),
    deleteOverride: (id: string) => del(`/api/admin/overrides/${encodeURIComponent(id)}`, null),
    products: () => get('/api/admin/products', adminProductsResponseSchema).then((r) => r.products),
    saveProduct: (id: string | null, input: UpsertProductInput) =>
      id ? put(`/api/admin/products/${encodeURIComponent(id)}`, idSchema, input) : post('/api/admin/products', idSchema, input),
    archiveProduct: (id: string) => del(`/api/admin/products/${encodeURIComponent(id)}`, null),
    restoreProduct: (id: string) => post(`/api/admin/products/${encodeURIComponent(id)}/restore`, null),
    planRequests: () => get('/api/admin/plan-requests', planRequestsResponseSchema).then((r) => r.requests),
    deliveryOrders: () => get('/api/admin/delivery-orders', deliveryOrdersResponseSchema).then((r) => r.orders),
    setDeliveryFulfilled: (id: string, fulfilled: boolean) => http('PATCH', `/api/admin/delivery-orders/${encodeURIComponent(id)}`, null, { fulfilled }),
    answerPlan: (id: string, status: 'in_progress' | 'delivered', response: string | null) =>
      post(`/api/admin/plan-requests/${encodeURIComponent(id)}`, planRequestsResponseSchema, { status, response }).then((r) => r.requests),
    broadcasts: () => get('/api/admin/broadcasts', adminBroadcastsSchema).then((r) => r.broadcasts),
    saveBroadcast: (id: string | null, input: BroadcastInput) => id
      ? http('PUT', `/api/admin/broadcasts/${encodeURIComponent(id)}`, null, input)
      : post('/api/admin/broadcasts', null, input),
    deleteBroadcast: (id: string) => del(`/api/admin/broadcasts/${encodeURIComponent(id)}`, null),
    hideBroadcast: (id: string) => http('PATCH', `/api/admin/broadcasts/${encodeURIComponent(id)}`, null, { published: false }),
  },
}
