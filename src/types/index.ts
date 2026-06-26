export type { User } from '@supabase/supabase-js'

export type ProfileRole = 'admin' | 'client'

export type Profile = {
  id: string
  role_id: string
  role: { name: ProfileRole }
  full_name: string
  dni: string
  phone: string | null
  created_at: string
  updated_at: string
}

export type Specialty = {
  id: string
  name: string
  description: string | null
  active: boolean
  created_at: string
  available_from: number | null
  available_until: number | null
  available_day: string | null
  image: string | null
  value: number | null
}

export type ShiftStatus = 'pending' | 'approved' | 'cancelled'

export type ShiftWithDetails = Shift & {
  client: Pick<Profile, 'id' | 'full_name' | 'dni'> | null
  specialty: Pick<Specialty, 'name'> | null
}

export type Shift = {
  id: string
  client_id: string
  specialty_id: string
  admin_id: string | null
  status: ShiftStatus
  assigned_date: string | null
  assigned_time: string | null
  admin_notes: string | null
  created_at: string
  updated_at: string
}
