import { supabase } from '../lib/supabase'
import type { Shift, ShiftWithDetails } from '../types'

export async function getAllShifts(): Promise<ShiftWithDetails[]> {
  const { data, error } = await supabase
    .from('shift')
    .select('*, client:client_id(id, full_name, dni), specialty:specialty_id(name, available_from, available_until, available_day)')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as ShiftWithDetails[]
}

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

export async function assignShift(
  shiftId: string,
  assignedDate: string,
  assignedTime: string,
): Promise<{ success: boolean }> {
  const { data, error } = await supabase.functions.invoke('assign-shift', {
    body: { shift_id: shiftId, assigned_date: assignedDate, assigned_time: assignedTime },
  })

  if (error) {
    const body = (error as { context?: { body?: { error?: string } } })?.context?.body
    throw new Error(body?.error ?? error.message)
  }

  return data as { success: boolean }
}

export async function getClientShifts(): Promise<ShiftWithDetails[]> {
  const { data: userData } = await supabase.auth.getUser()
  const clientId = userData.user?.id
  if (!clientId) throw new Error('Usuario no autenticado')

  const { data, error } = await supabase
    .from('shift')
    .select('*, client:client_id(id, full_name, dni), specialty:specialty_id(name, available_from, available_until, available_day)')
    .eq('client_id', clientId)
    .neq('status', 'cancelled')
    .not('assigned_date', 'is', null)
    .order('assigned_date', { ascending: true })
    .order('assigned_time', { ascending: true })

  if (error) throw error
  return (data ?? []) as ShiftWithDetails[]
}

export async function getPendingShiftsCount(): Promise<number> {
  const { count, error } = await supabase
    .from('shift')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  if (error) throw error
  return count ?? 0
}

export async function getApprovedShiftsCount(): Promise<number> {
  const { count, error } = await supabase
    .from('shift')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved')

  if (error) throw error
  return count ?? 0
}

export async function getTodayShiftsCount(): Promise<number> {
  const today = new Date().toISOString().split('T')[0]
  const { count, error } = await supabase
    .from('shift')
    .select('*', { count: 'exact', head: true })
    .eq('assigned_date', today)
    .neq('status', 'cancelled')

  if (error) throw error
  return count ?? 0
}

export async function getShiftsByDateRange(from: string, to: string): Promise<ShiftWithDetails[]> {
  const { data, error } = await supabase
    .from('shift')
    .select('*, client:client_id(id, full_name, dni), specialty:specialty_id(name, available_from, available_until, available_day)')
    .gte('assigned_date', from)
    .lte('assigned_date', to)
    .neq('status', 'cancelled')
    .not('assigned_date', 'is', null)
    .order('assigned_date', { ascending: true })
    .order('assigned_time', { ascending: true })

  if (error) throw error
  return (data ?? []) as ShiftWithDetails[]
}
