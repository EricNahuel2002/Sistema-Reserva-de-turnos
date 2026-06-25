import { supabase } from '../lib/supabase'
import type { Profile } from '../types'

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('profile')
    .select('*')
    .eq('id', userId)
    .single()

  return data as Profile | null
}

export async function createProfile(
  userId: string,
  fullName: string,
  dni: string,
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profile')
    .insert({ id: userId, full_name: fullName, dni })
    .select()
    .single()

  if (error) throw error
  return data as Profile
}
