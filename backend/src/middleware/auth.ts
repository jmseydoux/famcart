import { Request, Response, NextFunction } from 'express'
import { verifySupabaseToken } from '../lib/supabase'
import prisma from '../lib/prisma'

export interface AuthRequest extends Request {
  user?: { id: string; supabaseId: string; householdId: string | null }
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing authorization token' })
    return
  }

  const token = authHeader.slice(7)

  let supabaseUser: { id: string; email: string }
  try {
    supabaseUser = await verifySupabaseToken(token)
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
    return
  }

  const user = await prisma.user.findUnique({ where: { supabase_id: supabaseUser.id } })
  if (!user) {
    res.status(401).json({ error: 'User not found — call /auth/sync first' })
    return
  }

  req.user = { id: user.id, supabaseId: user.supabase_id, householdId: user.household_id }
  next()
}
