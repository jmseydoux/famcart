import { Router, Request, Response } from 'express'
import { verifySupabaseToken } from '../lib/supabase'
import prisma from '../lib/prisma'

const router = Router()

// Called after first Supabase sign-in to create the user in our DB
router.post('/sync', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing token' })
    return
  }

  const token = authHeader.slice(7)

  let supabaseUser: { id: string; email: string; user_metadata: Record<string, unknown> }
  try {
    supabaseUser = await verifySupabaseToken(token)
  } catch {
    res.status(401).json({ error: 'Invalid token' })
    return
  }

  const { name } = req.body
  const userName = name
    || (supabaseUser.user_metadata?.full_name as string | undefined)
    || (supabaseUser.user_metadata?.name as string | undefined)
    || supabaseUser.email.split('@')[0]

  const user = await prisma.user.upsert({
    where: { supabase_id: supabaseUser.id },
    create: {
      supabase_id: supabaseUser.id,
      email: supabaseUser.email,
      name: userName,
    },
    update: {},
  })

  res.json({ user })
})

export default router
