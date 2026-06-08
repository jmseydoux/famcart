import { Router, Response } from 'express'
import { AuthRequest, requireHouseholdAccess, requireHouseholdAdmin } from '../middleware/auth'
import prisma from '../lib/prisma'
import crypto from 'crypto'

const router = Router()

function generateCode(): string {
  return crypto.randomBytes(3).toString('hex').toUpperCase()
}

async function notifyHouseholdMembers(
  householdId: string,
  excludeUserId: string,
  type: 'LIST_MODIFIED' | 'SHOPPING_STARTED' | 'MEMBER_JOINED',
  message: string,
) {
  const members = await prisma.householdMember.findMany({
    where: { household_id: householdId, user_id: { not: excludeUserId } },
  })
  await prisma.notification.createMany({
    data: members.map(m => ({ user_id: m.user_id, household_id: householdId, type, message })),
  })
}

// ── Households ────────────────────────────────────────────────────────────────

// List user's households
router.get('/', async (req: AuthRequest, res: Response) => {
  const members = await prisma.householdMember.findMany({
    where: { user_id: req.user!.id },
    include: {
      household: {
        include: {
          _count: { select: { members: true, lists: true } },
          suppliers: { orderBy: { name: 'asc' } },
        },
      },
    },
    orderBy: { joined_at: 'asc' },
  })
  const households = members.map(m => ({ ...m.household, role: m.role }))
  res.json({ households })
})

// Create a household
router.post('/', async (req: AuthRequest, res: Response) => {
  const { name } = req.body
  if (!name?.trim()) { res.status(400).json({ error: 'Nom du ménage requis' }); return }

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } })
  const count = await prisma.householdMember.count({ where: { user_id: req.user!.id, role: 'ADMIN' } })
  if (count >= (user?.max_households ?? 1)) {
    res.status(403).json({ error: `Quota atteint (max ${user?.max_households} ménage(s))` }); return
  }

  const household = await prisma.household.create({
    data: {
      name: name.trim(),
      members: { create: { user_id: req.user!.id, role: 'ADMIN' } },
    },
  })
  res.status(201).json({ household: { ...household, role: 'ADMIN' } })
})

// Get a household (member only)
router.get('/:hid', requireHouseholdAccess, async (req: AuthRequest, res: Response) => {
  const hid = req.params.hid as string
  const household = await prisma.household.findUnique({
    where: { id: hid },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
      suppliers: { orderBy: { name: 'asc' } },
      _count: { select: { lists: true, products: true } },
    },
  })
  res.json({ household: { ...household, role: req.householdMember!.role } })
})

// Update household name (admin)
router.patch('/:hid', requireHouseholdAccess, requireHouseholdAdmin, async (req: AuthRequest, res: Response) => {
  const hid = req.params.hid as string
  const { name } = req.body
  if (!name?.trim()) { res.status(400).json({ error: 'Nom requis' }); return }
  const household = await prisma.household.update({
    where: { id: hid },
    data: { name: name.trim() },
  })
  res.json({ household })
})

// ── Members ───────────────────────────────────────────────────────────────────

router.get('/:hid/members', requireHouseholdAccess, async (req: AuthRequest, res: Response) => {
  const hid = req.params.hid as string
  const members = await prisma.householdMember.findMany({
    where: { household_id: hid },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { joined_at: 'asc' },
  })
  res.json({ members })
})

router.patch('/:hid/members/:uid', requireHouseholdAccess, requireHouseholdAdmin, async (req: AuthRequest, res: Response) => {
  const hid = req.params.hid as string
  const uid = req.params.uid as string
  const { role } = req.body
  if (!['ADMIN', 'MEMBER'].includes(role)) { res.status(400).json({ error: 'Rôle invalide' }); return }
  const member = await prisma.householdMember.update({
    where: { user_id_household_id: { user_id: uid, household_id: hid } },
    data: { role },
  })
  res.json({ member })
})

router.delete('/:hid/members/:uid', requireHouseholdAccess, requireHouseholdAdmin, async (req: AuthRequest, res: Response) => {
  const hid = req.params.hid as string
  const uid = req.params.uid as string
  if (uid === req.user!.id) {
    res.status(400).json({ error: 'Vous ne pouvez pas vous retirer vous-même' }); return
  }
  await prisma.householdMember.delete({
    where: { user_id_household_id: { user_id: uid, household_id: hid } },
  })
  res.status(204).send()
})

// ── Household Invitations ─────────────────────────────────────────────────────

router.get('/:hid/invitations', requireHouseholdAccess, requireHouseholdAdmin, async (req: AuthRequest, res: Response) => {
  const hid = req.params.hid as string
  const invitations = await prisma.householdInvitation.findMany({
    where: { household_id: hid },
    include: { created_by: { select: { name: true } } },
    orderBy: { created_at: 'desc' },
  })
  res.json({ invitations })
})

router.post('/:hid/invitations', requireHouseholdAccess, requireHouseholdAdmin, async (req: AuthRequest, res: Response) => {
  const hid = req.params.hid as string
  const { email, expires_in_days = 7 } = req.body

  // Check member quota
  const memberCount = await prisma.householdMember.count({ where: { household_id: hid } })
  const creator = await prisma.user.findUnique({ where: { id: req.user!.id } })
  if (memberCount >= (creator?.max_members ?? 5)) {
    res.status(403).json({ error: `Quota de membres atteint (max ${creator?.max_members})` }); return
  }

  const expires_at = new Date(Date.now() + expires_in_days * 86400_000)

  // Generate unique code
  let code = generateCode()
  let attempts = 0
  while (attempts < 5) {
    const existing = await prisma.householdInvitation.findUnique({ where: { code } })
    if (!existing) break
    code = generateCode()
    attempts++
  }

  const invitation = await prisma.householdInvitation.create({
    data: { household_id: req.params.hid as string, created_by_id: req.user!.id, code, email, expires_at },
  })
  res.status(201).json({ invitation })
})

router.delete('/:hid/invitations/:iid', requireHouseholdAccess, requireHouseholdAdmin, async (req: AuthRequest, res: Response) => {
  const hid = req.params.hid as string
  const iid = req.params.iid as string
  const inv = await prisma.householdInvitation.findFirst({
    where: { id: iid, household_id: hid },
  })
  if (!inv) { res.status(404).json({ error: 'Invitation introuvable' }); return }
  await prisma.householdInvitation.delete({ where: { id: iid } })
  res.status(204).send()
})

// Join a household via token or code (authenticated user)
router.post('/join', async (req: AuthRequest, res: Response) => {
  const { token, code } = req.body
  if (!token && !code) { res.status(400).json({ error: 'Token ou code requis' }); return }

  const inv = token
    ? await prisma.householdInvitation.findUnique({ where: { token } })
    : await prisma.householdInvitation.findUnique({ where: { code } })

  if (!inv) { res.status(404).json({ error: 'Invitation introuvable' }); return }
  if (inv.used_at) { res.status(410).json({ error: 'Invitation déjà utilisée' }); return }
  if (inv.expires_at < new Date()) { res.status(410).json({ error: 'Invitation expirée' }); return }

  // Check if already a member
  const existing = await prisma.householdMember.findUnique({
    where: { user_id_household_id: { user_id: req.user!.id, household_id: inv.household_id } },
  })
  if (existing) { res.status(400).json({ error: 'Vous êtes déjà membre de ce ménage' }); return }

  const member = await prisma.householdMember.create({
    data: { user_id: req.user!.id, household_id: inv.household_id, role: 'MEMBER' },
    include: { household: true },
  })

  await prisma.householdInvitation.update({ where: { id: inv.id }, data: { used_at: new Date() } })

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } })
  await notifyHouseholdMembers(inv.household_id, req.user!.id, 'MEMBER_JOINED', `${user?.name} a rejoint le ménage`)

  res.json({ household: member.household, role: member.role })
})

// ── Suppliers ─────────────────────────────────────────────────────────────────

router.get('/:hid/suppliers', requireHouseholdAccess, async (req: AuthRequest, res: Response) => {
  const hid = req.params.hid as string
  const suppliers = await prisma.supplier.findMany({
    where: { household_id: hid },
    orderBy: { name: 'asc' },
  })
  res.json({ suppliers })
})

router.post('/:hid/suppliers', requireHouseholdAccess, requireHouseholdAdmin, async (req: AuthRequest, res: Response) => {
  const hid = req.params.hid as string
  const { name } = req.body
  if (!name?.trim()) { res.status(400).json({ error: 'Nom requis' }); return }
  const supplier = await prisma.supplier.create({
    data: { name: name.trim(), household_id: hid },
  })
  res.status(201).json({ supplier })
})

router.patch('/:hid/suppliers/:sid', requireHouseholdAccess, requireHouseholdAdmin, async (req: AuthRequest, res: Response) => {
  const sid = req.params.sid as string
  const { name } = req.body
  if (!name?.trim()) { res.status(400).json({ error: 'Nom requis' }); return }
  const supplier = await prisma.supplier.update({
    where: { id: sid },
    data: { name: name.trim() },
  })
  res.json({ supplier })
})

router.delete('/:hid/suppliers/:sid', requireHouseholdAccess, requireHouseholdAdmin, async (req: AuthRequest, res: Response) => {
  const sid = req.params.sid as string
  await prisma.supplier.delete({ where: { id: sid } })
  res.status(204).send()
})

export { notifyHouseholdMembers }
export default router
