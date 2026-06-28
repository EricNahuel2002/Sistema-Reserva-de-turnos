import { supabase } from '../lib/supabase'

export async function registerClient(email: string, password: string, fullName: string, dni: string): Promise<void> {
  const { error } = await supabase.functions.invoke('create-client', {
    body: { email, password, full_name: fullName, dni },
  })

  if (error) throw new Error(error.message)
}
