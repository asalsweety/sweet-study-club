import { Hono, type MiddlewareHandler } from 'hono'
import { z } from 'zod'
import {
  cheerInputSchema,
  friendCodeInputSchema,
  inviteTokenInputSchema,
  leaderboardPeriodSchema,
  liveScopeSchema,
  respondRequestInputSchema,
  targetUserInputSchema,
} from '../../src/shared/api/social'
import { readBody, readQuery, userId } from '../http/validation'
import * as friends from '../social/friends'
import * as live from '../social/live'
import type { WorkerEnvironment } from '../types'

export function socialRoutes(requireSession: MiddlewareHandler<WorkerEnvironment>) {
  const app = new Hono<WorkerEnvironment>()
  for (const path of ['/friends', '/friends/*', '/live', '/leaderboard', '/cheers', '/cheers/*', '/presence']) {
    app.use(path, requireSession)
  }

  const listed = async (db: D1Database, me: string) => friends.listFriends(db, me)

  app.get('/friends', async (c) => c.json(await listed(c.env.DB, userId(c))))

  app.post('/friends/by-code', async (c) => {
    const { friendCode } = await readBody(c, friendCodeInputSchema)
    const status = await friends.addByFriendCode(c.env.DB, userId(c), friendCode)
    return c.json({ status, ...(await listed(c.env.DB, userId(c))) })
  })

  app.post('/friends/invites', async (c) => c.json(await friends.createInvite(c.env.DB, userId(c)), 201))

  app.post('/friends/invites/accept', async (c) => {
    const { token } = await readBody(c, inviteTokenInputSchema)
    const status = await friends.acceptInvite(c.env.DB, userId(c), token)
    return c.json({ status, ...(await listed(c.env.DB, userId(c))) })
  })

  app.post('/friends/respond', async (c) => {
    const input = await readBody(c, respondRequestInputSchema)
    await friends.respondToRequest(c.env.DB, userId(c), input.userId, input.accept)
    return c.json(await listed(c.env.DB, userId(c)))
  })

  app.post('/friends/remove', async (c) => {
    const input = await readBody(c, targetUserInputSchema)
    await friends.removeFriendship(c.env.DB, userId(c), input.userId)
    return c.json(await listed(c.env.DB, userId(c)))
  })

  app.post('/friends/block', async (c) => {
    const input = await readBody(c, targetUserInputSchema)
    await friends.blockUser(c.env.DB, userId(c), input.userId)
    return c.json(await listed(c.env.DB, userId(c)))
  })

  app.post('/friends/unblock', async (c) => {
    const input = await readBody(c, targetUserInputSchema)
    await friends.unblockUser(c.env.DB, userId(c), input.userId)
    return c.json(await listed(c.env.DB, userId(c)))
  })

  app.get('/live', async (c) => {
    const { scope } = readQuery(c, z.object({ scope: liveScopeSchema.default('friends') }))
    return c.json(await live.listLive(c.env.DB, userId(c), scope))
  })

  app.get('/leaderboard', async (c) => {
    const query = readQuery(
      c,
      z.object({ period: leaderboardPeriodSchema.default('week'), scope: liveScopeSchema.default('everyone') }),
    )
    return c.json(await live.leaderboard(c.env.DB, userId(c), query.period, query.scope))
  })

  app.post('/presence', async (c) => {
    await live.touchPresence(c.env.DB, userId(c))
    return c.body(null, 204)
  })

  app.get('/cheers', async (c) => c.json({ cheers: await live.listUnseenCheers(c.env.DB, userId(c)) }))

  app.post('/cheers', async (c) => {
    const input = await readBody(c, cheerInputSchema)
    await live.sendCheer(c.env.DB, userId(c), input.userId, input.emoji)
    return c.body(null, 204)
  })

  app.post('/cheers/seen', async (c) => {
    await live.markCheersSeen(c.env.DB, userId(c))
    return c.body(null, 204)
  })

  return app
}
