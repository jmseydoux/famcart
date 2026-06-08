import { Router, Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import prisma from '../lib/prisma'

const router = Router()

// List all platform invitations
router.get('/invitations', async (_req: AuthRequest, res: Response) => {
  const invitations = await prisma.platformInvitation.findMany({
    include: { created_by: { select: { name: true, email: true } }, used_by: { select: { name: true, email: true } } },
    orderBy: { created_at: 'desc' },
  })
  res.json({ invitations })
})

// Create a platform invitation
router.post('/invitations', async (req: AuthRequest, res: Response) => {
  const { max_households = 1, max_members = 5, expires_in_days = 7 } = req.body
  const expires_at = new Date(Date.now() + expires_in_days * 86400_000)
  const invitation = await prisma.platformInvitation.create({
    data: { created_by_id: req.user!.id, max_households, max_members, expires_at },
  })
  res.status(201).json({ invitation })
})

// Revoke a platform invitation
router.delete('/invitations/:id', async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string
  const inv = await prisma.platformInvitation.findUnique({ where: { id } })
  if (!inv) { res.status(404).json({ error: 'Invitation introuvable' }); return }
  if (inv.used_at) { res.status(400).json({ error: 'Impossible de révoquer une invitation déjà utilisée' }); return }
  await prisma.platformInvitation.delete({ where: { id } })
  res.status(204).send()
})

// List all users
router.get('/users', async (_req: AuthRequest, res: Response) => {
  const users = await prisma.user.findMany({
    select: {
      id: true, name: true, email: true, is_super_admin: true,
      max_households: true, max_members: true, created_at: true,
      _count: { select: { householdMembers: true } },
    },
    orderBy: { created_at: 'desc' },
  })
  res.json({ users })
})

// List all households
router.get('/households', async (_req: AuthRequest, res: Response) => {
  const households = await prisma.household.findMany({
    include: {
      _count: { select: { members: true, lists: true } },
      members: {
        where: { role: 'ADMIN' },
        include: { user: { select: { name: true, email: true } } },
        take: 1,
      },
    },
    orderBy: { created_at: 'desc' },
  })
  res.json({ households })
})

export default router
