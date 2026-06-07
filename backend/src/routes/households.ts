import { Router, Response } from 'express'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

router.use(requireAuth)

// Get current user's household
router.get('/me', async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { household: { include: { users: true, suppliers: true } } },
  })
  res.json({ household: user?.household ?? null })
})

// Create a new household
router.post('/', async (req: AuthRequest, res: Response) => {
  if (req.user!.householdId) {
    res.status(400).json({ error: 'Already in a household' })
    return
  }

  const { name } = req.body
  if (!name?.trim()) {
    res.status(400).json({ error: 'Name is required' })
    return
  }

  const household = await prisma.household.create({ data: { name: name.trim() } })
  await prisma.user.update({
    where: { id: req.user!.id },
    data: { household_id: household.id },
  })

  res.status(201).json({ household })
})

// Join an existing household via invite code
router.post('/join', async (req: AuthRequest, res: Response) => {
  if (req.user!.householdId) {
    res.status(400).json({ error: 'Already in a household' })
    return
  }

  const { invite_code } = req.body
  if (!invite_code?.trim()) {
    res.status(400).json({ error: 'invite_code is required' })
    return
  }

  const household = await prisma.household.findUnique({ where: { invite_code: invite_code.trim() } })
  if (!household) {
    res.status(404).json({ error: 'Invalid invite code' })
    return
  }

  await prisma.user.update({
    where: { id: req.user!.id },
    data: { household_id: household.id },
  })

  res.json({ household })
})

export default router
