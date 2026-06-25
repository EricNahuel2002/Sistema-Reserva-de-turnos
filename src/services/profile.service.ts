import { supabase } from '../lib/supabase'
import type { Profile } from '../types'

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('profile')
    .select('*, role:role_id(name)')
    .eq('id', userId)
    .single()

  return data as Profile | null
}
