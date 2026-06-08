import { Router, Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import prisma from '../lib/prisma'

const router = Router()

// Get user notifications (unread first, last 50)
router.get('/', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id
  const notifications = await prisma.notification.findMany({
    where: { user_id: userId },
    orderBy: [{ read: 'asc' }, { created_at: 'desc' }],
    take: 50,
  })
  const unreadCount = notifications.filter(n => !n.read).length
  res.json({ notifications, unreadCount })
})

// Mark a notification as read
router.patch('/:id/read', async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string
  const userId = req.user!.id
  const notif = await prisma.notification.findFirst({ where: { id, user_id: userId } })
  if (!notif) { res.status(404).json({ error: 'Notification introuvable' }); return }
  await prisma.notification.update({ where: { id }, data: { read: true } })
  res.status(204).send()
})

// Mark all as read
router.post('/read-all', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id
  await prisma.notification.updateMany({ where: { user_id: userId, read: false }, data: { read: true } })
  res.status(204).send()
})

export default router
