import { createClient } from '@supabase/supabase-js'
import type { SupabaseClientLike } from './types.ts'
import { corsHeaders, validateRequiredFields } from './helpers.ts'

export async function handleCancelShift(
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

    if (!profile || (profile.role as unknown as { name: string }).name !== 'admin') {
      return new Response(JSON.stringify({ error: 'Solo administradores pueden cancelar turnos' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const missingFields = validateRequiredFields(body, ['shift_id'])
    if (missingFields.length > 0) {
      return new Response(JSON.stringify({
        error: `Faltan campos obligatorios: ${missingFields.join(', ')}`,
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { shift_id, admin_notes } = body as {
      shift_id: string
      admin_notes?: string
    }

    const { data: shift, error: shiftError } = await client
      .from('shift')
      .select('id, status')
      .eq('id', shift_id)
      .single()

    if (shiftError || !shift) {
      return new Response(JSON.stringify({ error: 'Turno no encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if ((shift as { status: string }).status === 'cancelled') {
      return new Response(JSON.stringify({ error: 'El turno ya está cancelado' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const updateData: Record<string, unknown> = {
      status: 'cancelled',
      admin_id: user.id,
      updated_at: new Date().toISOString(),
    }
    if (admin_notes !== undefined) {
      updateData.admin_notes = admin_notes
    }

    const { error: updateError } = await client
      .from('shift')
      .update(updateData)
      .eq('id', shift_id)

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
