import { assertEquals } from 'std/testing/asserts.ts'
import { handleCancelShift } from './handler.ts'
import type { SupabaseClientLike } from './types.ts'

function mockSupabase(
  overrides: {
    authError?: { message: string }
    singleResults?: Array<{ data: unknown; error: unknown }>
    singleResult?: { data: unknown; error: unknown }
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
      select: () => ({
        eq: () => ({ single: getSingle }),
      }),
      update: () => ({
        eq: () => {
          if (overrides.updateError) return { error: overrides.updateError }
          return { error: null }
        },
      }),
    }),
  }
}

Deno.test('handleCancelShift - CORS preflight', async () => {
  const req = new Request('http://localhost', { method: 'OPTIONS' })
  const res = await handleCancelShift(req)
  assertEquals(res.status, 200)
  assertEquals(res.headers.get('Access-Control-Allow-Origin'), '*')
})

Deno.test('handleCancelShift - method not allowed', async () => {
  const req = new Request('http://localhost', { method: 'GET' })
  const res = await handleCancelShift(req)
  assertEquals(res.status, 405)
  const body = await res.json()
  assertEquals(body.error, 'Method not allowed')
})

Deno.test('handleCancelShift - sin auth header devuelve 401', async () => {
  const req = new Request('http://localhost', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
  const supabase = mockSupabase()
  const res = await handleCancelShift(req, supabase as unknown as SupabaseClientLike)
  assertEquals(res.status, 401)
  const body = await res.json()
  assertEquals(body.error, 'Falta token de autorización')
})

Deno.test('handleCancelShift - token inválido devuelve 401', async () => {
  const req = new Request('http://localhost', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer bad-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
  const supabase = mockSupabase({ authError: { message: 'Invalid token' } })
  const res = await handleCancelShift(req, supabase as unknown as SupabaseClientLike)
  assertEquals(res.status, 401)
  const body = await res.json()
  assertEquals(body.error, 'Token inválido o expirado')
})

Deno.test('handleCancelShift - usuario no admin devuelve 403', async () => {
  const req = new Request('http://localhost', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer valid-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
  const supabase = mockSupabase({
    singleResult: { data: { role: { name: 'client' } }, error: null },
  })
  const res = await handleCancelShift(req, supabase as unknown as SupabaseClientLike)
  assertEquals(res.status, 403)
  const body = await res.json()
  assertEquals(body.error, 'Solo administradores pueden cancelar turnos')
})

Deno.test('handleCancelShift - shift_id faltante devuelve 400', async () => {
  const req = new Request('http://localhost', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer valid-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
  const supabase = mockSupabase({
    singleResult: { data: { role: { name: 'admin' } }, error: null },
  })
  const res = await handleCancelShift(req, supabase as unknown as SupabaseClientLike)
  assertEquals(res.status, 400)
  const body = await res.json()
  assertEquals(body.error.includes('shift_id'), true)
})

Deno.test('handleCancelShift - shift no encontrado devuelve 404', async () => {
  const req = new Request('http://localhost', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer valid-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ shift_id: '999' }),
  })
  const supabase = mockSupabase({
    singleResults: [
      { data: { role: { name: 'admin' } }, error: null },
      { data: null, error: { message: 'Not found' } },
    ],
  })
  const res = await handleCancelShift(req, supabase as unknown as SupabaseClientLike)
  assertEquals(res.status, 404)
  const body = await res.json()
  assertEquals(body.error, 'Turno no encontrado')
})

Deno.test('handleCancelShift - shift ya cancelado devuelve 400', async () => {
  const req = new Request('http://localhost', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer valid-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ shift_id: '1' }),
  })
  const supabase = mockSupabase({
    singleResults: [
      { data: { role: { name: 'admin' } }, error: null },
      { data: { id: '1', status: 'cancelled' }, error: null },
    ],
  })
  const res = await handleCancelShift(req, supabase as unknown as SupabaseClientLike)
  assertEquals(res.status, 400)
  const body = await res.json()
  assertEquals(body.error, 'El turno ya está cancelado')
})

Deno.test('handleCancelShift - error en update devuelve 500', async () => {
  const req = new Request('http://localhost', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer valid-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ shift_id: '1' }),
  })
  const supabase = mockSupabase({
    singleResults: [
      { data: { role: { name: 'admin' } }, error: null },
      { data: { id: '1', status: 'pending' }, error: null },
    ],
    updateError: { message: 'DB error' },
  })
  const res = await handleCancelShift(req, supabase as unknown as SupabaseClientLike)
  assertEquals(res.status, 500)
  const body = await res.json()
  assertEquals(body.error, 'DB error')
})

Deno.test('handleCancelShift - happy path cancela pending devuelve 200', async () => {
  const req = new Request('http://localhost', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer valid-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ shift_id: '1' }),
  })
  const supabase = mockSupabase({
    singleResults: [
      { data: { role: { name: 'admin' } }, error: null },
      { data: { id: '1', status: 'pending' }, error: null },
    ],
  })
  const res = await handleCancelShift(req, supabase as unknown as SupabaseClientLike)
  assertEquals(res.status, 200)
  const body = await res.json()
  assertEquals(body.success, true)
})

Deno.test('handleCancelShift - happy path cancela approved devuelve 200', async () => {
  const req = new Request('http://localhost', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer valid-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ shift_id: '1', admin_notes: 'Cancelado por inasistencia' }),
  })
  const supabase = mockSupabase({
    singleResults: [
      { data: { role: { name: 'admin' } }, error: null },
      { data: { id: '1', status: 'approved' }, error: null },
    ],
  })
  const res = await handleCancelShift(req, supabase as unknown as SupabaseClientLike)
  assertEquals(res.status, 200)
  const body = await res.json()
  assertEquals(body.success, true)
})

Deno.test('handleCancelShift - error interno del servidor', async () => {
  const req = new Request('http://localhost', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer valid-token', 'Content-Type': 'application/json' },
    body: 'not-json',
  })
  const supabase = mockSupabase({
    singleResult: { data: { role: { name: 'admin' } }, error: null },
  })
  const res = await handleCancelShift(req, supabase as unknown as SupabaseClientLike)
  assertEquals(res.status, 500)
  const body = await res.json()
  assertEquals(typeof body.error, 'string')
})
