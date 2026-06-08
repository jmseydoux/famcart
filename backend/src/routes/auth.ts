import { Router, Request, Response } from 'express'
import { verifySupabaseToken } from '../lib/supabase'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

// Validate a platform invite token (public)
router.get('/invitation/:token', async (req: Request, res: Response) => {
  const token = req.params.token as string
  const inv = await prisma.platformInvitation.findUnique({
    where: { token },
    select: { id: true, expires_at: true, used_at: true, max_households: true, max_members: true },
  })
  if (!inv) { res.status(404).json({ error: 'Invitation introuvable' }); return }
  if (inv.used_at) { res.status(410).json({ error: 'Invitation déjà utilisée' }); return }
  if (inv.expires_at < new Date()) { res.status(410).json({ error: 'Invitation expirée' }); return }
  res.json({ valid: true, max_households: inv.max_households, max_members: inv.max_members })
})

// Create/sync user after Supabase sign-in
router.post('/sync', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token manquant' }); return
  }

  const token = authHeader.slice(7)
  let supabaseUser: { id: string; email: string; user_metadata: Record<string, unknown> }
  try {
    supabaseUser = await verifySupabaseToken(token)
  } catch {
    res.status(401).json({ error: 'Token invalide' }); return
  }

  const { name, invite_token } = req.body
  const userName = name
    || (supabaseUser.user_metadata?.full_name as string | undefined)
    || (supabaseUser.user_metadata?.name as string | undefined)
    || supabaseUser.email.split('@')[0]

  // Check if user already exists
  const existing = await prisma.user.findUnique({ where: { supabase_id: supabaseUser.id } })

  if (existing) {
    // Existing user: just return their data (no quota change on re-sync)
    const households = await prisma.householdMember.findMany({
      where: { user_id: existing.id },
      include: { household: true },
    })
    res.json({ user: { ...existing, households } }); return
  }

  // New user: validate invite token
  let maxHouseholds = 1
  let maxMembers = 5
  let invitationId: string | undefined

  if (invite_token) {
    const inv = await prisma.platformInvitation.findUnique({ where: { token: invite_token } })
    if (!inv || inv.used_at || inv.expires_at < new Date()) {
      res.status(400).json({ error: 'Invitation invalide ou expirée' }); return
    }
    maxHouseholds = inv.max_households
    maxMembers = inv.max_members
    invitationId = inv.id
  }

  const user = await prisma.user.create({
    data: {
      supabase_id: supabaseUser.id,
      email: supabaseUser.email,
      name: userName,
      max_households: maxHouseholds,
      max_members: maxMembers,
    },
  })

  // Mark invitation as used
  if (invitationId) {
    await prisma.platformInvitation.update({
      where: { id: invitationId },
      data: { used_at: new Date(), used_by_id: user.id },
    })
  }

  res.json({ user: { ...user, households: [] } })
})

// Get current user profile
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: {
      householdMembers: { include: { household: true } },
    },
  })
  res.json({ user })
})

// Bootstrap first super-admin (requires SUPER_ADMIN_SECRET env var)
router.post('/bootstrap', requireAuth, async (req: AuthRequest, res: Response) => {
  const { secret } = req.body
  const envSecret = process.env.SUPER_ADMIN_SECRET
  if (!envSecret || secret !== envSecret) {
    res.status(403).json({ error: 'Secret invalide' }); return
  }
  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: { is_super_admin: true, max_households: 999 },
  })
  res.json({ user })
})

export default router
