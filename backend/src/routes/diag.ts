import { Router, Request, Response } from 'express'
import prisma from '../lib/prisma'

const router = Router()

router.get('/', async (_req: Request, res: Response) => {
  let dbOk = false
  let dbLatency = 0
  let dbError: string | null = null
  let tables: Record<string, number> | null = null

  try {
    const t0 = Date.now()
    const [households, users, suppliers, products, listItems, lists, sessions, sessionItems, notifications, householdMembers, householdInvitations, platformInvitations] = await Promise.all([
      prisma.household.count(),
      prisma.user.count(),
      prisma.supplier.count(),
      prisma.product.count(),
      prisma.listItem.count(),
      prisma.shoppingList.count(),
      prisma.shoppingSession.count(),
      prisma.sessionItem.count(),
      prisma.notification.count(),
      prisma.householdMember.count(),
      prisma.householdInvitation.count(),
      prisma.platformInvitation.count(),
    ])
    dbLatency = Date.now() - t0
    dbOk = true
    tables = { households, users, suppliers, products, lists, listItems, sessions, sessionItems, notifications, householdMembers, householdInvitations, platformInvitations }
  } catch (err) {
    dbError = err instanceof Error ? err.message : String(err)
  }

  res.json({
    ok: dbOk,
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    nodeVersion: process.version,
    env: {
      DATABASE_URL: !!process.env.DATABASE_URL,
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_SECRET_KEY: !!process.env.SUPABASE_SECRET_KEY,
      SUPER_ADMIN_SECRET: !!process.env.SUPER_ADMIN_SECRET,
      PORT: !!process.env.PORT,
    },
    db: {
      ok: dbOk,
      latency: dbLatency,
      error: dbError,
      tables,
    },
  })
})

export default router
