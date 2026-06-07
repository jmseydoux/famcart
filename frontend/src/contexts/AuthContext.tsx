import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { api } from '../lib/api'

interface AppUser {
  id: string
  name: string
  email: string
  household_id: string | null
}

interface AuthContextValue {
  session: Session | null
  appUser: AppUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<AppUser | null>
  signUp: (email: string, password: string, name: string) => Promise<void>
  signOut: () => Promise<void>
  refreshUser: () => Promise<AppUser | null>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  async function syncUser(supabaseUser: User | null): Promise<AppUser | null> {
    if (!supabaseUser) {
      setAppUser(null)
      return null
    }
    try {
      const data = await api.post<{ user: AppUser }>('/auth/sync', {
        name: supabaseUser.user_metadata?.name,
      })
      setAppUser(data.user)
      return data.user
    } catch {
      setAppUser(null)
      return null
    }
  }

  async function refreshUser(): Promise<AppUser | null> {
    const { data } = await supabase.auth.getSession()
    return syncUser(data.session?.user ?? null)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      syncUser(data.session?.user ?? null).finally(() => setLoading(false))
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string): Promise<AppUser | null> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
    return syncUser(data.user)
  }

  async function signUp(email: string, password: string, name: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    })
    if (error) throw new Error(error.message)
  }

  async function signOut() {
    await supabase.auth.signOut()
    setAppUser(null)
  }

  return (
    <AuthContext.Provider value={{ session, appUser, loading, signIn, signUp, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
