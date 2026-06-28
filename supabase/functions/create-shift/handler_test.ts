import { assertEquals } from 'std/testing/asserts.ts'
import { handleCreateShift } from './handler.ts'
import type { SupabaseClientLike } from './types.ts'

function mockSupabase(
  overrides: {
    authError?: { message: string }
    singleResults?: Array<{ data: unknown; error: unknown }>
    insertError?: { message: string }
  } = {},
) {
  let singleCalls = 0
  const allResults = overrides.singleResults ?? []

  const getSingle = () => {
    const idx = singleCalls
    singleCalls++
    return idx < allResults.length ? allResults[idx] : { data: null, error: null }
  }

  return {
    auth: {
      getUser: () => {
        if (overrides.authError) return { data: { user: null }, error: overrides.authError }
        return { data: { user: { id: 'client-uid' } }, error: null }
      },
    },
    from: () => ({
      select: () => ({
        eq: () => ({ single: getSingle }),
      }),
      insert: () => {
        if (overrides.insertError) {
          return {
            select: () => ({ single: () => ({ data: null, error: overrides.insertError }) }),
          }
        }
        return {
          select: () => ({ single: getSingle }),
        }
      },
    }),
  }
}

Deno.test('handleCreateShift - CORS preflight', async () => {
  const req = new Request('http://localhost', { method: 'OPTIONS' })
  const res = await handleCreateShift(req)
  assertEquals(res.status, 200)
  assertEquals(res.headers.get('Access-Control-Allow-Origin'), '*')
})

Deno.test('handleCreateShift - method not allowed', async () => {
  const req = new Request('http://localhost', { method: 'GET' })
  const res = await handleCreateShift(req)
  assertEquals(res.status, 405)
  const body = await res.json()
  assertEquals(body.error, 'Method not allowed')
})

Deno.test('handleCreateShift - sin auth header devuelve 401', async () => {
  const req = new Request('http://localhost', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
  const supabase = mockSupabase()
  const res = await handleCreateShift(req, supabase as unknown as SupabaseClientLike)
  assertEquals(res.status, 401)
  const body = await res.json()
  assertEquals(body.error, 'Falta token de autorización')
})

Deno.test('handleCreateShift - token inválido devuelve 401', async () => {
  const req = new Request('http://localhost', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer bad-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
  const supabase = mockSupabase({ authError: { message: 'Invalid token' } })
  const res = await handleCreateShift(req, supabase as unknown as SupabaseClientLike)
  assertEquals(res.status, 401)
  const body = await res.json()
  assertEquals(body.error, 'Token inválido o expirado')
})

Deno.test('handleCreateShift - admin no puede crear turno devuelve 403', async () => {
  const req = new Request('http://localhost', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer valid-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ specialty_id: 'spec-1' }),
  })
  const supabase = mockSupabase({
    singleResults: [
      { data: { role: { name: 'admin' } }, error: null },
    ],
  })
  const res = await handleCreateShift(req, supabase as unknown as SupabaseClientLike)
  assertEquals(res.status, 403)
  const body = await res.json()
  assertEquals(body.error, 'Solo los clientes pueden solicitar turnos')
})

Deno.test('handleCreateShift - specialty_id faltante devuelve 400', async () => {
  const req = new Request('http://localhost', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer valid-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
  const supabase = mockSupabase({
    singleResults: [
      { data: { role: { name: 'client' } }, error: null },
    ],
  })
  const res = await handleCreateShift(req, supabase as unknown as SupabaseClientLike)
  assertEquals(res.status, 400)
  const body = await res.json()
  assertEquals(body.error.includes('specialty_id'), true)
})

Deno.test('handleCreateShift - especialidad no encontrada devuelve 404', async () => {
  const req = new Request('http://localhost', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer valid-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ specialty_id: 'invalid-id' }),
  })
  const supabase = mockSupabase({
    singleResults: [
      { data: { role: { name: 'client' } }, error: null },
      { data: null, error: { message: 'Not found' } },
    ],
  })
  const res = await handleCreateShift(req, supabase as unknown as SupabaseClientLike)
  assertEquals(res.status, 404)
  const body = await res.json()
  assertEquals(body.error, 'Especialidad no encontrada')
})

Deno.test('handleCreateShift - especialidad inactiva devuelve 400', async () => {
  const req = new Request('http://localhost', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer valid-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ specialty_id: 'spec-1' }),
  })
  const supabase = mockSupabase({
    singleResults: [
      { data: { role: { name: 'client' } }, error: null },
      { data: { id: 'spec-1', active: false }, error: null },
    ],
  })
  const res = await handleCreateShift(req, supabase as unknown as SupabaseClientLike)
  assertEquals(res.status, 400)
  const body = await res.json()
  assertEquals(body.error, 'La especialidad no está disponible')
})

Deno.test('handleCreateShift - error en insert devuelve 500', async () => {
  const req = new Request('http://localhost', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer valid-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ specialty_id: 'spec-1' }),
  })
  const supabase = mockSupabase({
    singleResults: [
      { data: { role: { name: 'client' } }, error: null },
      { data: { id: 'spec-1', active: true }, error: null },
    ],
    insertError: { message: 'DB error' },
  })
  const res = await handleCreateShift(req, supabase as unknown as SupabaseClientLike)
  assertEquals(res.status, 500)
  const body = await res.json()
  assertEquals(body.error, 'DB error')
})

Deno.test('handleCreateShift - happy path devuelve 200', async () => {
  const req = new Request('http://localhost', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer valid-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ specialty_id: 'spec-1' }),
  })
  const supabase = mockSupabase({
    singleResults: [
      { data: { role: { name: 'client' } }, error: null },
      { data: { id: 'spec-1', active: true }, error: null },
      { data: { id: 1, client_id: 'client-uid', specialty_id: 'spec-1', status: 'pending' }, error: null },
    ],
  })
  const res = await handleCreateShift(req, supabase as unknown as SupabaseClientLike)
  assertEquals(res.status, 200)
  const body = await res.json()
  assertEquals(body.success, true)
  assertEquals(body.shift.status, 'pending')
})

Deno.test('handleCreateShift - error interno del servidor', async () => {
  const req = new Request('http://localhost', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer valid-token', 'Content-Type': 'application/json' },
    body: 'not-json',
  })
  const supabase = mockSupabase({
    singleResults: [
      { data: { role: { name: 'client' } }, error: null },
    ],
  })
  const res = await handleCreateShift(req, supabase as unknown as SupabaseClientLike)
  assertEquals(res.status, 500)
  const body = await res.json()
  assertEquals(typeof body.error, 'string')
})
