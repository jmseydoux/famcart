import { Router, Response } from 'express'
import { AuthRequest, requireHouseholdAccess } from '../middleware/auth'
import prisma from '../lib/prisma'

const router = Router({ mergeParams: true })

const DEFAULT_CATEGORIES = [
  'Fruits & Légumes', 'Viandes & Poissons', 'Produits laitiers',
  'Épicerie', 'Boissons', 'Hygiène & Beauté', 'Entretien',
  'Surgelés', 'Boulangerie', 'Autres',
]

// Get categories (default + custom used in household)
router.get('/categories', requireHouseholdAccess, async (req: AuthRequest, res: Response) => {
  const hid = req.params.hid as string
  const customCategories = await prisma.product.findMany({
    where: { household_id: hid },
    select: { category: true },
    distinct: ['category'],
  })
  const custom = customCategories.map(p => p.category).filter(c => !DEFAULT_CATEGORIES.includes(c))
  res.json({ categories: [...DEFAULT_CATEGORIES, ...custom] })
})

// List products
router.get('/', requireHouseholdAccess, async (req: AuthRequest, res: Response) => {
  const hid = req.params.hid as string
  const category = req.query.category as string | undefined
  const supplier_id = req.query.supplier_id as string | undefined
  const products = await prisma.product.findMany({
    where: {
      household_id: hid,
      ...(category ? { category } : {}),
      ...(supplier_id ? { suppliers: { some: { supplier_id } } } : {}),
    },
    include: { suppliers: { include: { supplier: true } } },
    orderBy: { name: 'asc' },
  })
  res.json({ products })
})

// Create product
router.post('/', requireHouseholdAccess, async (req: AuthRequest, res: Response) => {
  const hid = req.params.hid as string
  const { name, category, supplier_ids = [] } = req.body
  if (!name?.trim()) { res.status(400).json({ error: 'Nom requis' }); return }
  if (!category?.trim()) { res.status(400).json({ error: 'Catégorie requise' }); return }

  const product = await prisma.product.create({
    data: {
      name: name.trim(),
      category: category.trim(),
      household_id: hid,
      suppliers: { create: (supplier_ids as string[]).map((id: string) => ({ supplier_id: id })) },
    },
    include: { suppliers: { include: { supplier: true } } },
  })
  res.status(201).json({ product })
})

// Update product
router.patch('/:pid', requireHouseholdAccess, async (req: AuthRequest, res: Response) => {
  const pid = req.params.pid as string
  const { name, category, supplier_ids } = req.body

  if (supplier_ids !== undefined) {
    await prisma.productSupplier.deleteMany({ where: { product_id: pid } })
    if ((supplier_ids as string[]).length > 0) {
      await prisma.productSupplier.createMany({
        data: (supplier_ids as string[]).map((id: string) => ({ product_id: pid, supplier_id: id })),
      })
    }
  }

  const product = await prisma.product.update({
    where: { id: pid },
    data: {
      ...(name ? { name: name.trim() } : {}),
      ...(category ? { category: category.trim() } : {}),
    },
    include: { suppliers: { include: { supplier: true } } },
  })
  res.json({ product })
})

// Delete product
router.delete('/:pid', requireHouseholdAccess, async (req: AuthRequest, res: Response) => {
  const pid = req.params.pid as string
  await prisma.product.delete({ where: { id: pid } })
  res.status(204).send()
})

export default router
