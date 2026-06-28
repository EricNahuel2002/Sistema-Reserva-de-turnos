import { createClient } from '@supabase/supabase-js'
import type { SupabaseClientLike } from './types.ts'
import {
  corsHeaders,
  validateRequiredFields,
  isValidEmail,
  isValidPassword,
  isValidFullName,
  isValidDni,
} from './helpers.ts'

export async function handleCreateClient(
  req: Request,
  supabase?: SupabaseClientLike,
): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = await req.json()
    const missingFields = validateRequiredFields(body, ['email', 'password', 'full_name', 'dni'])
    if (missingFields.length > 0) {
      return new Response(JSON.stringify({
        error: `Todos los campos son obligatorios: ${missingFields.join(', ')}`,
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { email, password, full_name, dni } = body as {
      email: string
      password: string
      full_name: string
      dni: string
    }

    if (!isValidEmail(email)) {
      return new Response(JSON.stringify({ error: 'El email no tiene un formato válido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!isValidPassword(password)) {
      return new Response(JSON.stringify({ error: 'La contraseña debe tener al menos 6 caracteres' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!isValidFullName(full_name)) {
      return new Response(JSON.stringify({ error: 'El nombre debe tener al menos 3 caracteres y solo letras' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!isValidDni(dni)) {
      return new Response(JSON.stringify({ error: 'El DNI debe tener entre 7 y 8 dígitos numéricos' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const client = supabase ?? createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    const { data: userData, error: signUpError } = await client.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, dni },
    })

    if (signUpError) {
      return new Response(JSON.stringify({ error: signUpError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!userData) {
      return new Response(JSON.stringify({ error: 'Error al crear el usuario' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno del servidor'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}
