import { Router, Response } from 'express'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

router.use(requireAuth)

function requireHousehold(req: AuthRequest, res: Response): string | null {
  if (!req.user!.householdId) {
    res.status(403).json({ error: 'You must be in a household first' })
    return null
  }
  return req.user!.householdId
}

// GET /lists — open lists for the household
router.get('/', async (req: AuthRequest, res: Response) => {
  const householdId = requireHousehold(req, res)
  if (!householdId) return

  const lists = await prisma.shoppingList.findMany({
    where: { household_id: householdId, status: 'OPEN' },
    include: {
      creator: { select: { id: true, name: true } },
      supplier: { select: { id: true, name: true } },
      items: { where: { status: 'PENDING' }, select: { id: true } },
    },
    orderBy: { created_at: 'desc' },
  })

  const result = lists.map((l: typeof lists[0]) => ({ ...l, pending_count: l.items.length, items: undefined }))
  res.json({ lists: result })
})

// GET /lists/history — closed lists
router.get('/history', async (req: AuthRequest, res: Response) => {
  const householdId = requireHousehold(req, res)
  if (!householdId) return

  const lists = await prisma.shoppingList.findMany({
    where: { household_id: householdId, status: 'CLOSED' },
    include: {
      creator: { select: { id: true, name: true } },
      supplier: { select: { id: true, name: true } },
      items: { select: { id: true, status: true } },
    },
    orderBy: { closed_at: 'desc' },
  })

  res.json({ lists })
})

// GET /lists/:id — single list with items
router.get('/:id', async (req: AuthRequest, res: Response) => {
  const householdId = requireHousehold(req, res)
  if (!householdId) return

  const listId = String(req.params.id)
  const list = await prisma.shoppingList.findFirst({
    where: { id: listId, household_id: householdId },
    include: {
      creator: { select: { id: true, name: true } },
      supplier: { select: { id: true, name: true } },
      items: {
        include: { requester: { select: { id: true, name: true } } },
        orderBy: { created_at: 'asc' },
      },
    },
  })

  if (!list) {
    res.status(404).json({ error: 'List not found' })
    return
  }

  res.json({ list })
})

// POST /lists — create a new open list
router.post('/', async (req: AuthRequest, res: Response) => {
  const householdId = requireHousehold(req, res)
  if (!householdId) return

  const { supplier_id } = req.body

  // Enforce one open list per (household, supplier)
  const existing = await prisma.shoppingList.findFirst({
    where: { household_id: householdId, supplier_id: supplier_id ?? null, status: 'OPEN' },
  })
  if (existing) {
    res.status(409).json({ error: 'An open list for this supplier already exists', list_id: existing.id })
    return
  }

  if (supplier_id) {
    const supplier = await prisma.supplier.findFirst({ where: { id: supplier_id, household_id: householdId } })
    if (!supplier) {
      res.status(400).json({ error: 'Supplier not found' })
      return
    }
  }

  const list = await prisma.shoppingList.create({
    data: {
      household_id: householdId,
      created_by: req.user!.id,
      supplier_id: supplier_id ?? null,
    },
    include: {
      creator: { select: { id: true, name: true } },
      supplier: { select: { id: true, name: true } },
    },
  })

  res.status(201).json({ list })
})

// POST /lists/:id/items — add an item to a list
router.post('/:id/items', async (req: AuthRequest, res: Response) => {
  const householdId = requireHousehold(req, res)
  if (!householdId) return

  const list = await prisma.shoppingList.findFirst({
    where: { id: String(req.params.id), household_id: householdId, status: 'OPEN' },
  })
  if (!list) {
    res.status(404).json({ error: 'Open list not found' })
    return
  }

  const { name, quantity, unit } = req.body
  if (!name?.trim()) {
    res.status(400).json({ error: 'Item name is required' })
    return
  }

  const item = await prisma.shoppingItem.create({
    data: {
      name: name.trim(),
      quantity: quantity ?? 1,
      unit: unit?.trim() || null,
      list_id: list.id,
      requested_by: req.user!.id,
    },
    include: { requester: { select: { id: true, name: true } } },
  })

  res.status(201).json({ item })
})

// DELETE /lists/:id/items/:itemId — remove an item
router.delete('/:id/items/:itemId', async (req: AuthRequest, res: Response) => {
  const householdId = requireHousehold(req, res)
  if (!householdId) return

  const list = await prisma.shoppingList.findFirst({
    where: { id: String(req.params.id), household_id: householdId, status: 'OPEN' },
  })
  if (!list) {
    res.status(404).json({ error: 'Open list not found' })
    return
  }

  const item = await prisma.shoppingItem.findFirst({
    where: { id: String(req.params.itemId), list_id: list.id },
  })
  if (!item) {
    res.status(404).json({ error: 'Item not found' })
    return
  }

  await prisma.shoppingItem.delete({ where: { id: item.id } })
  res.status(204).end()
})

export default router
