import { Request, Response, NextFunction } from 'express'
import { verifySupabaseToken } from '../lib/supabase'
import prisma from '../lib/prisma'

export interface AuthRequest extends Request {
  user?: { id: string; supabaseId: string; isSuperAdmin: boolean; name: string; email: string }
  householdMember?: { id: string; role: string; household_id: string }
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token manquant' })
    return
  }

  const token = authHeader.slice(7)
  let supabaseUser: { id: string; email: string }
  try {
    supabaseUser = await verifySupabaseToken(token)
  } catch {
    res.status(401).json({ error: 'Token invalide ou expiré' })
    return
  }

  const user = await prisma.user.findUnique({ where: { supabase_id: supabaseUser.id } })
  if (!user) {
    res.status(401).json({ error: 'Utilisateur non trouvé — appelez /auth/sync d\'abord' })
    return
  }

  req.user = { id: user.id, supabaseId: user.supabase_id, isSuperAdmin: user.is_super_admin, name: user.name, email: user.email }
  next()
}

export async function requireSuperAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user?.isSuperAdmin) {
    res.status(403).json({ error: 'Accès Super-Admin requis' })
    return
  }
  next()
}

export async function requireHouseholdAccess(req: AuthRequest, res: Response, next: NextFunction) {
  const householdId = req.params.hid as string
  if (!householdId) {
    res.status(400).json({ error: 'ID de ménage manquant' })
    return
  }

  const member = await prisma.householdMember.findUnique({
    where: { user_id_household_id: { user_id: req.user!.id, household_id: householdId } },
  })
  if (!member) {
    res.status(403).json({ error: 'Vous n\'êtes pas membre de ce ménage' })
    return
  }

  req.householdMember = { id: member.id, role: member.role, household_id: householdId }
  next()
}

export async function requireHouseholdAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.householdMember?.role !== 'ADMIN') {
    res.status(403).json({ error: 'Rôle Admin requis pour cette action' })
    return
  }
  next()
}
