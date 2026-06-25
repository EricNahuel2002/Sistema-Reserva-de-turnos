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
