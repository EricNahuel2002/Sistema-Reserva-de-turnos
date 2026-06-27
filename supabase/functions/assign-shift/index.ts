import { serve } from 'std/http/server.ts'
import { createClient } from '@supabase/supabase-js'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const supabase = createClient(
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

    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Token inválido o expirado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: profile } = await supabase
      .from('profile')
      .select('role:role_id(name)')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role as unknown as { name: string }).name !== 'admin') {
      return new Response(JSON.stringify({ error: 'Solo administradores pueden asignar turnos' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { shift_id, assigned_date, assigned_time } = await req.json()

    if (!shift_id || !assigned_date || !assigned_time) {
      return new Response(JSON.stringify({ error: 'Faltan campos obligatorios: shift_id, assigned_date, assigned_time' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const timePattern = /^([01]\d|2[0-3]):(00|30)$/
    if (!timePattern.test(assigned_time)) {
      return new Response(JSON.stringify({ error: 'El horario debe ser cada 30 minutos (formato HH:00 o HH:30)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: shift, error: shiftError } = await supabase
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

    if (shift.status !== 'pending') {
      return new Response(JSON.stringify({ error: 'Solo se puede asignar horario a turnos pendientes' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { count } = await supabase
      .from('shift')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_date', assigned_date)
      .eq('assigned_time', assigned_time)
      .neq('status', 'cancelled')
      .neq('id', shift_id)

    if (count && count > 0) {
      return new Response(JSON.stringify({ error: 'El horario ya está ocupado' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { error: updateError } = await supabase
      .from('shift')
      .update({
        assigned_date,
        assigned_time,
        admin_id: user.id,
        status: 'approved',
        updated_at: new Date().toISOString(),
      })
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
})
