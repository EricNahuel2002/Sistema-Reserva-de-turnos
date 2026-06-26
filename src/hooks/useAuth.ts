import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getProfile } from '../services/profile.service'
import type { User, Session } from '@supabase/supabase-js'
import type { Profile } from '../types'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (userId: string) => {
    try {
      const p = await getProfile(userId)
      if (p) setProfile(p)
    } catch (err) {
      console.error('Failed to fetch profile:', err)
    }
  }

  useEffect(() => {
    let ignore = false

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (ignore) return
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        await fetchProfile(session.user.id)
      }
      if (!ignore) setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (ignore) return
      if (event === 'INITIAL_SESSION') return
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        if (event === 'SIGNED_IN') setLoading(true)
        await fetchProfile(session.user.id)
      } else {
        setProfile(null)
      }
      if (!ignore) setLoading(false)
    })

    return () => {
      ignore = true
      subscription.unsubscribe()
    }
  }, [])

  const signUp = async (email: string, password: string, fullName?: string, dni?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, dni },
      },
    })
    return { data, error }
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { data, error }
  }

  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google' })
    return { data, error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return { user, session, profile, loading, signUp, signIn, signInWithGoogle, signOut }
}
