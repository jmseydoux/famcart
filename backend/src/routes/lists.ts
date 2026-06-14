import { Router, Response } from 'express'
import { AuthRequest, requireHouseholdAccess } from '../middleware/auth'
import prisma from '../lib/prisma'
import { notifyHouseholdMembers } from './households'

const router = Router({ mergeParams: true })

// List active & in-progress lists
router.get('/', requireHouseholdAccess, async (req: AuthRequest, res: Response) => {
  const hid = req.params.hid as string
  const lists = await prisma.shoppingList.findMany({
    where: { household_id: hid, status: { in: ['ACTIVE', 'IN_PROGRESS'] } },
    include: {
      supplier: true,
      creator: { select: { id: true, name: true } },
      _count: { select: { items: { where: { status: 'TO_BUY' } } } },
      sessions: { where: { ended_at: null }, include: { shopper: { select: { id: true, name: true } } }, take: 1 },
    },
    orderBy: { created_at: 'desc' },
  })
  res.json({ lists })
})

// Archived lists (history)
router.get('/history', requireHouseholdAccess, async (req: AuthRequest, res: Response) => {
  const hid = req.params.hid as string
  const lists = await prisma.shoppingList.findMany({
    where: { household_id: hid, status: 'ARCHIVED' },
    include: {
      supplier: true,
      creator: { select: { id: true, name: true } },
      sessions: {
        orderBy: { started_at: 'desc' },
        take: 1,
        include: { shopper: { select: { id: true, name: true } } },
      },
      items: {
        where: { status: { in: ['BOUGHT', 'SKIPPED'] } },
        select: { id: true, name: true, quantity: true, unit: true, status: true },
        orderBy: { name: 'asc' },
      },
      _count: { select: { items: { where: { status: 'BOUGHT' } } } },
    },
    orderBy: { closed_at: 'desc' },
    take: 50,
  })
  res.json({ lists })
})

// Get list with items
router.get('/:lid', requireHouseholdAccess, async (req: AuthRequest, res: Response) => {
  const hid = req.params.hid as string
  const lid = req.params.lid as string
  const list = await prisma.shoppingList.findFirst({
    where: { id: lid, household_id: hid },
    include: {
      supplier: true,
      creator: { select: { id: true, name: true } },
      items: {
        include: {
          added_by: { select: { id: true, name: true } },
          product: { select: { id: true, name: true, category: true } },
          sessionItems: { take: 1, orderBy: { id: 'desc' } },
        },
        orderBy: { created_at: 'asc' },
      },
      sessions: {
        where: { ended_at: null },
        include: { shopper: { select: { id: true, name: true } } },
        take: 1,
      },
    },
  })
  if (!list) { res.status(404).json({ error: 'Liste introuvable' }); return }
  res.json({ list })
})

// Create a list
router.post('/', requireHouseholdAccess, async (req: AuthRequest, res: Response) => {
  const hid = req.params.hid as string
  const { supplier_id } = req.body

  if (supplier_id) {
    const existing = await prisma.shoppingList.findFirst({
      where: { household_id: hid, supplier_id, status: { in: ['ACTIVE', 'IN_PROGRESS'] } },
    })
    if (existing) {
      res.status(409).json({ error: 'Une liste active existe déjà pour ce fournisseur', list_id: existing.id }); return
    }
  }

  const list = await prisma.shoppingList.create({
    data: {
      household_id: hid,
      created_by_id: req.user!.id,
      ...(supplier_id ? { supplier_id } : {}),
    },
    include: { supplier: true, creator: { select: { id: true, name: true } } },
  })
  res.status(201).json({ list })
})

// Delete a list
router.delete('/:lid', requireHouseholdAccess, async (req: AuthRequest, res: Response) => {
  const hid = req.params.hid as string
  const lid = req.params.lid as string
  const list = await prisma.shoppingList.findFirst({ where: { id: lid, household_id: hid } })
  if (!list) { res.status(404).json({ error: 'Liste introuvable' }); return }
  if (list.status === 'IN_PROGRESS') { res.status(409).json({ error: 'Impossible de supprimer une liste en cours de courses' }); return }
  await prisma.shoppingList.delete({ where: { id: lid } })
  res.status(204).send()
})

// ── List Items ────────────────────────────────────────────────────────────────

// Add item
router.post('/:lid/items', requireHouseholdAccess, async (req: AuthRequest, res: Response) => {
  const hid = req.params.hid as string
  const lid = req.params.lid as string
  const { name, quantity = 1, unit, notes, desired_date, product_id } = req.body
  if (!name?.trim()) { res.status(400).json({ error: 'Nom de l\'article requis' }); return }

  const list = await prisma.shoppingList.findFirst({
    where: { id: lid, household_id: hid, status: { in: ['ACTIVE', 'IN_PROGRESS'] } },
  })
  if (!list) { res.status(404).json({ error: 'Liste introuvable ou archivée' }); return }

  const item = await prisma.listItem.create({
    data: {
      list_id: lid,
      name: name.trim(),
      quantity: Number(quantity),
      unit: unit || null,
      notes: notes || null,
      desired_date: desired_date ? new Date(desired_date) : null,
      added_by_id: req.user!.id,
      product_id: product_id || null,
    },
    include: { added_by: { select: { id: true, name: true } } },
  })

  await notifyHouseholdMembers(hid, req.user!.id, 'LIST_MODIFIED',
    `${item.added_by.name} a ajouté "${item.name}" à la liste`)

  res.status(201).json({ item })
})

// Update item
router.patch('/:lid/items/:iid', requireHouseholdAccess, async (req: AuthRequest, res: Response) => {
  const iid = req.params.iid as string
  const { name, quantity, unit, notes, desired_date, status } = req.body
  const item = await prisma.listItem.update({
    where: { id: iid },
    data: {
      ...(name ? { name: name.trim() } : {}),
      ...(quantity !== undefined ? { quantity: Number(quantity) } : {}),
      ...(unit !== undefined ? { unit: unit || null } : {}),
      ...(notes !== undefined ? { notes: notes || null } : {}),
      ...(desired_date !== undefined ? { desired_date: desired_date ? new Date(desired_date) : null } : {}),
      ...(status ? { status } : {}),
    },
    include: { added_by: { select: { id: true, name: true } } },
  })
  res.json({ item })
})

// Delete item
router.delete('/:lid/items/:iid', requireHouseholdAccess, async (req: AuthRequest, res: Response) => {
  const iid = req.params.iid as string
  await prisma.listItem.delete({ where: { id: iid } })
  res.status(204).send()
})

export default router
