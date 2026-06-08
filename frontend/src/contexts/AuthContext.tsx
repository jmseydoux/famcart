import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { api } from '../lib/api'

export interface AppUser {
  id: string
  name: string
  email: string
  is_super_admin: boolean
  max_households: number
  max_members: number
}

interface AuthContextValue {
  session: Session | null
  appUser: AppUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string, inviteToken?: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  async function syncUser(supabaseUser: User | null, inviteToken?: string): Promise<void> {
    if (!supabaseUser) { setAppUser(null); return }
    try {
      const data = await api.post<{ user: AppUser }>('/auth/sync', {
        name: supabaseUser.user_metadata?.full_name ?? supabaseUser.user_metadata?.name,
        invite_token: inviteToken,
      })
      setAppUser(data.user)
    } catch {
      setAppUser(null)
    }
  }

  async function refreshUser() {
    if (!session?.user) return
    await syncUser(session.user)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      syncUser(data.session?.user ?? null).finally(() => setLoading(false))
    })

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession)
      if (event === 'SIGNED_IN') syncUser(newSession?.user ?? null)
      if (event === 'SIGNED_OUT') setAppUser(null)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string): Promise<void> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
    await syncUser(data.user)
  }

  async function signUp(email: string, password: string, name: string, inviteToken?: string): Promise<void> {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } })
    if (error) throw new Error(error.message)
    if (data.user) await syncUser(data.user, inviteToken)
  }

  async function signInWithGoogle(): Promise<void> {
    const inviteToken = sessionStorage.getItem('pendingInviteToken') ?? undefined
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: inviteToken ? { invite_token: inviteToken } : undefined,
      },
    })
    if (error) throw new Error(error.message)
  }

  async function signOut() {
    await supabase.auth.signOut()
    setAppUser(null)
  }

  return (
    <AuthContext.Provider value={{ session, appUser, loading, signIn, signUp, signInWithGoogle, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
