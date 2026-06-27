import { createClient } from '@supabase/supabase-js'
import type { SupabaseClientLike } from './types.ts'
import {
  corsHeaders,
  validateRequiredFields,
  isValidAdminCode,
} from './helpers.ts'

export async function handleCreateAdmin(
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
    const missingFields = validateRequiredFields(body, ['email', 'password', 'full_name', 'dni', 'admin_code'])
    if (missingFields.length > 0) {
      return new Response(JSON.stringify({
        error: `Todos los campos son obligatorios: ${missingFields.join(', ')}`,
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { email, password, full_name, dni, admin_code } = body as {
      email: string
      password: string
      full_name: string
      dni: string
      admin_code: string
    }

    if (!isValidAdminCode(admin_code, Deno.env.get('ADMIN_SECRET_CODE'))) {
      return new Response(JSON.stringify({ error: 'Código de administrador inválido' }), {
        status: 403,
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

    const userId = userData.user.id

    const { data: adminRole } = await client
      .from('role')
      .select('id')
      .eq('name', 'admin')
      .single()

    if (!adminRole) {
      return new Response(JSON.stringify({ error: 'Rol admin no encontrado en la base de datos' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { error: updateError } = await client
      .from('profile')
      .update({ role_id: adminRole.id })
      .eq('id', userId)

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
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
