export type { User } from '@supabase/supabase-js'

export enum ProfileRole {
  Admin = 'admin',
  Client = 'client',
}

export type Profile = {
  id: string
  role: ProfileRole
  full_name: string
  dni: string
  phone: string | null
  created_at: string
  updated_at: string
}
