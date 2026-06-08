import { Router, Response } from 'express'
import { AuthRequest, requireHouseholdAccess } from '../middleware/auth'
import prisma from '../lib/prisma'
import { notifyHouseholdMembers } from './households'

const router = Router({ mergeParams: true })

// Get active session for a list
router.get('/:lid/session', requireHouseholdAccess, async (req: AuthRequest, res: Response) => {
  const hid = req.params.hid as string
  const lid = req.params.lid as string
  void hid // used via requireHouseholdAccess
  const session = await prisma.shoppingSession.findFirst({
    where: { list_id: lid, ended_at: null },
    include: {
      shopper: { select: { id: true, name: true } },
      items: { include: { item: true } },
    },
  })
  res.json({ session })
})

// Start a shopping session
router.post('/:lid/session/start', requireHouseholdAccess, async (req: AuthRequest, res: Response) => {
  const hid = req.params.hid as string
  const lid = req.params.lid as string

  const list = await prisma.shoppingList.findFirst({
    where: { id: lid, household_id: hid },
    include: { items: { where: { status: 'TO_BUY' } }, supplier: true },
  })
  if (!list) { res.status(404).json({ error: 'Liste introuvable' }); return }
  if (list.status === 'ARCHIVED') { res.status(400).json({ error: 'Liste archivée' }); return }
  if (list.status === 'IN_PROGRESS') { res.status(409).json({ error: 'Une session est déjà en cours' }); return }

  const session = await prisma.shoppingSession.create({
    data: {
      list_id: lid,
      household_id: hid,
      shopper_id: req.user!.id,
      items: {
        create: list.items.map(item => ({ item_id: item.id, status: 'PENDING' as const })),
      },
    },
    include: {
      shopper: { select: { id: true, name: true } },
      items: { include: { item: true } },
    },
  })

  await prisma.shoppingList.update({ where: { id: lid }, data: { status: 'IN_PROGRESS' } })

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } })
  await notifyHouseholdMembers(hid, req.user!.id, 'SHOPPING_STARTED',
    `${user?.name} a commencé les courses${list.supplier ? ` chez ${list.supplier.name}` : ''}`)

  res.status(201).json({ session })
})

// Update a session item status
router.patch('/:lid/session/items/:siid', requireHouseholdAccess, async (req: AuthRequest, res: Response) => {
  const { status } = req.body
  if (!['PENDING', 'BOUGHT', 'UNAVAILABLE', 'SKIPPED'].includes(status)) {
    res.status(400).json({ error: 'Statut invalide' }); return
  }
  const item = await prisma.sessionItem.update({
    where: { id: req.params.siid as string },
    data: { status },
    include: { item: true },
  })
  res.json({ item })
})

// Refresh session (add newly added list items)
router.post('/:lid/session/refresh', requireHouseholdAccess, async (req: AuthRequest, res: Response) => {
  const lid = req.params.lid as string
  const session = await prisma.shoppingSession.findFirst({
    where: { list_id: lid, ended_at: null },
    include: { items: { select: { item_id: true } } },
  })
  if (!session) { res.status(404).json({ error: 'Aucune session active' }); return }

  const existingItemIds = session.items.map(i => i.item_id)
  const newItems = await prisma.listItem.findMany({
    where: { list_id: lid, status: 'TO_BUY', id: { notIn: existingItemIds } },
  })

  if (newItems.length > 0) {
    await prisma.sessionItem.createMany({
      data: newItems.map(item => ({ session_id: session.id, item_id: item.id, status: 'PENDING' as const })),
    })
  }

  const updatedSession = await prisma.shoppingSession.findUnique({
    where: { id: session.id },
    include: {
      shopper: { select: { id: true, name: true } },
      items: { include: { item: true } },
    },
  })
  res.json({ session: updatedSession, added: newItems.length })
})

// End a shopping session
router.post('/:lid/session/end', requireHouseholdAccess, async (req: AuthRequest, res: Response) => {
  const hid = req.params.hid as string
  const lid = req.params.lid as string

  const session = await prisma.shoppingSession.findFirst({
    where: { list_id: lid, ended_at: null },
    include: { items: { include: { item: true } } },
  })
  if (!session) { res.status(404).json({ error: 'Aucune session active' }); return }

  const boughtItemIds = session.items.filter(i => i.status === 'BOUGHT').map(i => i.item_id)
  const skippedItems = session.items.filter(i => i.status === 'PENDING' || i.status === 'SKIPPED')

  if (boughtItemIds.length > 0) {
    await prisma.listItem.updateMany({
      where: { id: { in: boughtItemIds } },
      data: { status: 'BOUGHT' },
    })
  }

  await prisma.shoppingSession.update({ where: { id: session.id }, data: { ended_at: new Date() } })
  await prisma.shoppingList.update({
    where: { id: lid },
    data: { status: 'ARCHIVED', closed_at: new Date() },
  })

  let newListId: string | null = null
  if (skippedItems.length > 0) {
    const oldList = await prisma.shoppingList.findUnique({ where: { id: lid } })
    const newList = await prisma.shoppingList.create({
      data: {
        household_id: hid,
        supplier_id: oldList?.supplier_id ?? null,
        created_by_id: req.user!.id,
        items: {
          create: skippedItems.map(si => ({
            name: si.item.name,
            quantity: si.item.quantity,
            unit: si.item.unit,
            notes: si.item.notes,
            desired_date: si.item.desired_date,
            added_by_id: si.item.added_by_id,
            product_id: si.item.product_id,
          })),
        },
      },
    })
    newListId = newList.id
  }

  res.json({
    archived_list_id: lid,
    new_list_id: newListId,
    bought: boughtItemIds.length,
    skipped: skippedItems.length,
  })
})

export default router
