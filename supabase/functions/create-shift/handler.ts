import { createClient } from '@supabase/supabase-js'
import type { SupabaseClientLike } from './types.ts'
import { corsHeaders, validateRequiredFields } from './helpers.ts'

export async function handleCreateShift(
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
    const client = supabase ?? createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Falta token de autorización' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: { user }, error: userError } = await client.auth.getUser(
      authHeader.replace('Bearer ', ''),
    )
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Token inválido o expirado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: profile } = await client
      .from('profile')
      .select('role:role_id(name)')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role as unknown as { name: string }).name !== 'client') {
      return new Response(JSON.stringify({ error: 'Solo los clientes pueden solicitar turnos' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const missingFields = validateRequiredFields(body, ['specialty_id'])
    if (missingFields.length > 0) {
      return new Response(JSON.stringify({
        error: `Faltan campos obligatorios: ${missingFields.join(', ')}`,
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { specialty_id } = body as { specialty_id: string }

    const { data: specialty, error: specialtyError } = await client
      .from('specialty')
      .select('id, active')
      .eq('id', specialty_id)
      .single()

    if (specialtyError || !specialty) {
      return new Response(JSON.stringify({ error: 'Especialidad no encontrada' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!specialty.active) {
      return new Response(JSON.stringify({ error: 'La especialidad no está disponible' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: shift, error: insertError } = await client
      .from('shift')
      .insert({
        client_id: user.id,
        specialty_id,
        status: 'pending',
      })
      .select()
      .single()

    if (insertError) {
      const errMsg = (insertError as { message: string }).message
      return new Response(JSON.stringify({ error: errMsg }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true, shift }), {
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
