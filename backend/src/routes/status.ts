import { Router, Request, Response } from 'express'
import prisma from '../lib/prisma'

const router = Router()

router.get('/', async (_req: Request, res: Response) => {
  try {
    const [households, users, suppliers, items, sessions, products] = await Promise.all([
      prisma.household.count(),
      prisma.user.count(),
      prisma.supplier.count(),
      prisma.listItem.count(),
      prisma.shoppingSession.count(),
      prisma.product.count(),
    ])

    res.json({
      tables: [
        { name: 'Household',       count: households },
        { name: 'User',            count: users      },
        { name: 'Supplier',        count: suppliers  },
        { name: 'Product',         count: products   },
        { name: 'ListItem',        count: items      },
        { name: 'ShoppingSession', count: sessions   },
      ],
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    res.status(500).json({ error: 'Impossible de se connecter à la base de données.', detail: message })
  }
})

export default router
