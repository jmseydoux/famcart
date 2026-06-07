import { Router, Response } from 'express'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

router.use(requireAuth)

// GET /suppliers — list suppliers for the household
router.get('/', async (req: AuthRequest, res: Response) => {
  if (!req.user!.householdId) {
    res.status(403).json({ error: 'You must be in a household first' })
    return
  }

  const suppliers = await prisma.supplier.findMany({
    where: { household_id: req.user!.householdId },
    orderBy: { name: 'asc' },
  })

  res.json({ suppliers })
})

// POST /suppliers — add a supplier to the household
router.post('/', async (req: AuthRequest, res: Response) => {
  if (!req.user!.householdId) {
    res.status(403).json({ error: 'You must be in a household first' })
    return
  }

  const { name } = req.body
  if (!name?.trim()) {
    res.status(400).json({ error: 'Name is required' })
    return
  }

  const supplier = await prisma.supplier.create({
    data: { name: name.trim(), household_id: req.user!.householdId },
  })

  res.status(201).json({ supplier })
})

export default router
