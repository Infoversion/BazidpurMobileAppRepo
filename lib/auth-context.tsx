import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { type Session, type User as SupabaseUser } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { bootstrapNotifications } from './notifications'
import type { User, UserRole } from './types'

interface AuthContextValue {
  session: Session | null
  user: User | null
  role: UserRole | null
  loading: boolean
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  role: null,
  loading: true,
  signOut: async () => {},
  refreshUser: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  async function fetchProfile(supabaseUser: SupabaseUser) {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', supabaseUser.id)
      .single()
    setUser(data ?? null)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        fetchProfile(session.user).finally(() => setLoading(false))
        // Notifications bootstrap is delayed and fully sandboxed so a native
        // module exception during setup can never propagate into the auth
        // pipeline (we hit a SIGSEGV in TurboModule -> Hermes error handling
        // on the first build). Runs ~3s after sign-in so the rest of the app
        // is mounted first.
        setTimeout(() => {
          try { bootstrapNotifications().catch(() => {}) } catch { /* swallow */ }
        }, 3000)
      } else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) {
        fetchProfile(session.user)
        setTimeout(() => {
          try { bootstrapNotifications().catch(() => {}) } catch { /* swallow */ }
        }, 3000)
      } else setUser(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function refreshUser() {
    const { data: { session: s } } = await supabase.auth.getSession()
    if (s?.user) await fetchProfile(s.user)
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
  }

  return (
    <AuthContext.Provider value={{ session, user, role: user?.role ?? null, loading, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
