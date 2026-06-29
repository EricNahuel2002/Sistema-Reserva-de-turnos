import { supabase } from '../lib/supabase'
import type { Profile, Specialty } from '../types'

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profile')
    .select('*, role:role_id(name)')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Error fetching profile:', error.message)
    return null
  }

  return data as Profile | null
}

export async function getSpecialtiesCount(): Promise<number> {
  const { count, error } = await supabase
    .from('specialty')
    .select('*', { count: 'exact', head: true })
    .eq('active', true)

  if (error) throw error
  return count ?? 0
}

export async function getSpecialties(): Promise<Specialty[]> {
  const { data } = await supabase
    .from('specialty')
    .select('*')
    .eq('active', true)
    .order('name')

  return (data ?? []) as Specialty[]
}

export async function getAllSpecialties(): Promise<Specialty[]> {
  const { data } = await supabase
    .from('specialty')
    .select('*')
    .order('name')

  return (data ?? []) as Specialty[]
}

export async function createSpecialty(
  specialtyData: Omit<Specialty, 'id' | 'created_at'>,
): Promise<{ success: boolean }> {
  const { data, error } = await supabase.functions.invoke('create-specialty', {
    body: specialtyData,
  })

  if (error) {
    const body = (error as { context?: { body?: { error?: string } } })?.context?.body
    throw new Error(body?.error ?? error.message)
  }

  return data as { success: boolean }
}
