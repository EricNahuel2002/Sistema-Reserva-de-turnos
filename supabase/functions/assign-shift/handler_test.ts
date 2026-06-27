import { assertEquals } from 'std/testing/asserts.ts'
import { handleAssignShift } from './handler.ts'
import type { SupabaseClientLike } from './helpers.ts'

function mockSupabase(
  overrides: {
    authError?: { message: string }
    singleResults?: Array<{ data: unknown; error: unknown }>
    singleResult?: { data: unknown; error: unknown }
    conflict?: boolean
    updateError?: { message: string }
  } = {},
) {
  let singleCalls = 0
  const allResults = overrides.singleResults ?? (overrides.singleResult ? [overrides.singleResult] : [])

  const getSingle = () => {
    const idx = singleCalls
    singleCalls++
    return idx < allResults.length ? allResults[idx] : { data: null, error: null }
  }

  return {
    auth: {
      getUser: () => {
        if (overrides.authError) return { data: { user: null }, error: overrides.authError }
        return { data: { user: { id: 'admin-uid' } }, error: null }
      },
    },
    from: () => ({
      select: (_columns: string, opts?: { count?: string; head?: boolean }) => {
        if (opts?.count === 'exact') {
          return {
            eq: () => ({
              eq: () => ({
                neq: () => ({
                  neq: () => ({ data: null, count: overrides.conflict ? 1 : 0, error: null }),
                }),
              }),
            }),
          }
        }
        return {
          eq: () => ({ single: getSingle }),
        }
      },
      update: () => ({
        eq: () => {
          if (overrides.updateError) return { error: overrides.updateError }
          return { error: null }
        },
      }),
    }),
  }
}

Deno.test('handleAssignShift - CORS preflight', async () => {
  const req = new Request('http://localhost', { method: 'OPTIONS' })
  const res = await handleAssignShift(req)
  assertEquals(res.status, 200)
  assertEquals(res.headers.get('Access-Control-Allow-Origin'), '*')
})

Deno.test('handleAssignShift - method not allowed', async () => {
  const req = new Request('http://localhost', { method: 'GET' })
  const res = await handleAssignShift(req)
  assertEquals(res.status, 405)
  const body = await res.json()
  assertEquals(body.error, 'Method not allowed')
})

Deno.test('handleAssignShift - sin auth header devuelve 401', async () => {
  const req = new Request('http://localhost', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
  const supabase = mockSupabase()
  const res = await handleAssignShift(req, supabase as unknown as SupabaseClientLike)
  assertEquals(res.status, 401)
  const body = await res.json()
  assertEquals(body.error, 'Falta token de autorización')
})

Deno.test('handleAssignShift - token inválido devuelve 401', async () => {
  const req = new Request('http://localhost', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer bad-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
  const supabase = mockSupabase({ authError: { message: 'Invalid token' } })
  const res = await handleAssignShift(req, supabase as unknown as SupabaseClientLike)
  assertEquals(res.status, 401)
  const body = await res.json()
  assertEquals(body.error, 'Token inválido o expirado')
})

Deno.test('handleAssignShift - usuario no admin devuelve 403', async () => {
  const req = new Request('http://localhost', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer valid-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
  const supabase = mockSupabase({
    singleResult: { data: { role: { name: 'client' } }, error: null },
  })
  const res = await handleAssignShift(req, supabase as unknown as SupabaseClientLike)
  assertEquals(res.status, 403)
  const body = await res.json()
  assertEquals(body.error, 'Solo administradores pueden asignar turnos')
})

Deno.test('handleAssignShift - campos obligatorios faltantes devuelve 400', async () => {
  const req = new Request('http://localhost', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer valid-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
  const supabase = mockSupabase({
    singleResult: { data: { role: { name: 'admin' } }, error: null },
  })
  const res = await handleAssignShift(req, supabase as unknown as SupabaseClientLike)
  assertEquals(res.status, 400)
  const body = await res.json()
  assertEquals(body.error.includes('shift_id'), true)
  assertEquals(body.error.includes('assigned_date'), true)
  assertEquals(body.error.includes('assigned_time'), true)
})

Deno.test('handleAssignShift - tiempo formato inválido devuelve 400', async () => {
  const req = new Request('http://localhost', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer valid-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ shift_id: 1, assigned_date: '2026-07-01', assigned_time: '08:15' }),
  })
  const supabase = mockSupabase({
    singleResult: { data: { role: { name: 'admin' } }, error: null },
  })
  const res = await handleAssignShift(req, supabase as unknown as SupabaseClientLike)
  assertEquals(res.status, 400)
  const body = await res.json()
  assertEquals(body.error, 'El horario debe ser cada 30 minutos (formato HH:00 o HH:30)')
})

Deno.test('handleAssignShift - shift no encontrado devuelve 404', async () => {
  const req = new Request('http://localhost', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer valid-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ shift_id: 999, assigned_date: '2026-07-01', assigned_time: '08:00' }),
  })
  const supabase = mockSupabase({
    singleResults: [
      { data: { role: { name: 'admin' } }, error: null },
      { data: null, error: { message: 'Not found' } },
    ],
  })
  const res = await handleAssignShift(req, supabase as unknown as SupabaseClientLike)
  assertEquals(res.status, 404)
  const body = await res.json()
  assertEquals(body.error, 'Turno no encontrado')
})

Deno.test('handleAssignShift - shift no pending devuelve 400', async () => {
  const req = new Request('http://localhost', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer valid-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ shift_id: 1, assigned_date: '2026-07-01', assigned_time: '08:00' }),
  })
  const supabase = mockSupabase({
    singleResults: [
      { data: { role: { name: 'admin' } }, error: null },
      { data: { id: 1, status: 'approved', specialty: null }, error: null },
    ],
  })
  const res = await handleAssignShift(req, supabase as unknown as SupabaseClientLike)
  assertEquals(res.status, 400)
  const body = await res.json()
  assertEquals(body.error, 'Solo se puede asignar horario a turnos pendientes')
})

Deno.test('handleAssignShift - especialidad sin rango horario devuelve 400', async () => {
  const req = new Request('http://localhost', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer valid-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ shift_id: 1, assigned_date: '2026-07-01', assigned_time: '08:00' }),
  })
  const supabase = mockSupabase({
    singleResults: [
      { data: { role: { name: 'admin' } }, error: null },
      { data: { id: 1, status: 'pending', specialty: { available_from: null, available_until: null } }, error: null },
    ],
  })
  const res = await handleAssignShift(req, supabase as unknown as SupabaseClientLike)
  assertEquals(res.status, 400)
  const body = await res.json()
  assertEquals(body.error, 'La especialidad no tiene rango horario configurado')
})

Deno.test('handleAssignShift - horario fuera de rango devuelve 400', async () => {
  const req = new Request('http://localhost', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer valid-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ shift_id: 1, assigned_date: '2026-07-01', assigned_time: '18:00' }),
  })
  const supabase = mockSupabase({
    singleResults: [
      { data: { role: { name: 'admin' } }, error: null },
      { data: { id: 1, status: 'pending', specialty: { available_from: 8, available_until: 17, available_day: null } }, error: null },
    ],
  })
  const res = await handleAssignShift(req, supabase as unknown as SupabaseClientLike)
  assertEquals(res.status, 400)
  const body = await res.json()
  assertEquals(body.error.includes('El horario debe estar entre'), true)
})

Deno.test('handleAssignShift - día de semana incorrecto devuelve 400', async () => {
  const req = new Request('http://localhost', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer valid-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ shift_id: 1, assigned_date: '2026-06-29', assigned_time: '10:00' }),
  })
  const supabase = mockSupabase({
    singleResults: [
      { data: { role: { name: 'admin' } }, error: null },
      { data: { id: 1, status: 'pending', specialty: { available_from: 8, available_until: 17, available_day: 'sábado' } }, error: null },
    ],
  })
  const res = await handleAssignShift(req, supabase as unknown as SupabaseClientLike)
  assertEquals(res.status, 400)
  const body = await res.json()
  assertEquals(body.error, 'La especialidad solo atiende los días sábado')
})

Deno.test('handleAssignShift - conflicto de horario devuelve 409', async () => {
  const req = new Request('http://localhost', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer valid-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ shift_id: 1, assigned_date: '2026-06-29', assigned_time: '10:00' }),
  })
  const supabase = mockSupabase({
    singleResults: [
      { data: { role: { name: 'admin' } }, error: null },
      { data: { id: 1, status: 'pending', specialty: { available_from: 8, available_until: 17, available_day: 'lunes' } }, error: null },
    ],
    conflict: true,
  })
  const res = await handleAssignShift(req, supabase as unknown as SupabaseClientLike)
  assertEquals(res.status, 409)
  const body = await res.json()
  assertEquals(body.error, 'El horario ya está ocupado')
})

Deno.test('handleAssignShift - error en update devuelve 500', async () => {
  const req = new Request('http://localhost', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer valid-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ shift_id: 1, assigned_date: '2026-06-29', assigned_time: '10:00' }),
  })
  const supabase = mockSupabase({
    singleResults: [
      { data: { role: { name: 'admin' } }, error: null },
      { data: { id: 1, status: 'pending', specialty: { available_from: 8, available_until: 17, available_day: 'lunes' } }, error: null },
    ],
    updateError: { message: 'DB error' },
  })
  const res = await handleAssignShift(req, supabase as unknown as SupabaseClientLike)
  assertEquals(res.status, 500)
  const body = await res.json()
  assertEquals(body.error, 'DB error')
})

Deno.test('handleAssignShift - happy path devuelve 200', async () => {
  const req = new Request('http://localhost', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer valid-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ shift_id: 1, assigned_date: '2026-06-29', assigned_time: '10:00' }),
  })
  const supabase = mockSupabase({
    singleResults: [
      { data: { role: { name: 'admin' } }, error: null },
      { data: { id: 1, status: 'pending', specialty: { available_from: 8, available_until: 17, available_day: 'lunes' } }, error: null },
    ],
  })
  const res = await handleAssignShift(req, supabase as unknown as SupabaseClientLike)
  assertEquals(res.status, 200)
  const body = await res.json()
  assertEquals(body.success, true)
})

Deno.test('handleAssignShift - error interno del servidor', async () => {
  const req = new Request('http://localhost', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer valid-token', 'Content-Type': 'application/json' },
    body: 'not-json',
  })
  const supabase = mockSupabase({
    singleResult: { data: { role: { name: 'admin' } }, error: null },
  })
  const res = await handleAssignShift(req, supabase as unknown as SupabaseClientLike)
  assertEquals(res.status, 500)
  const body = await res.json()
  assertEquals(typeof body.error, 'string')
})
