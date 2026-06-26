import { supabase } from '../lib/supabase'
import type { Shift } from '../types'

export async function createShift(specialtyId: string): Promise<Shift> {
  const { data: userData } = await supabase.auth.getUser()
  const clientId = userData.user?.id
  if (!clientId) throw new Error('Usuario no autenticado')

  const { data, error } = await supabase
    .from('shift')
    .insert({
      client_id: clientId,
      specialty_id: specialtyId,
      status: 'pending',
    })
    .select()
    .single()

  if (error) throw error
  return data as Shift
}
