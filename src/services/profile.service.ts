import { supabase } from '../lib/supabase'
import type { Profile, Specialty } from '../types'

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('profile')
    .select('*, role:role_id(name)')
    .eq('id', userId)
    .single()

  return data as Profile | null
}

export async function getSpecialties(): Promise<Specialty[]> {
  const { data } = await supabase
    .from('specialty')
    .select('*')
    .eq('active', true)
    .order('name')

  return (data ?? []) as Specialty[]
}
