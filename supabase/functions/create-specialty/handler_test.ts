import { assertEquals } from 'std/testing/asserts.ts'
import { handleCreateSpecialty } from './handler.ts'
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
        return { data: { user: { id: 'admin-uid' } }, error: null }
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

Deno.test('handleCreateSpecialty - CORS preflight', async () => {
  const req = new Request('http://localhost', { method: 'OPTIONS' })
  const res = await handleCreateSpecialty(req)
  assertEquals(res.status, 200)
  assertEquals(res.headers.get('Access-Control-Allow-Origin'), '*')
})

Deno.test('handleCreateSpecialty - method not allowed', async () => {
  const req = new Request('http://localhost', { method: 'GET' })
  const res = await handleCreateSpecialty(req)
  assertEquals(res.status, 405)
  const body = await res.json()
  assertEquals(body.error, 'Method not allowed')
})

Deno.test('handleCreateSpecialty - sin auth header devuelve 401', async () => {
  const req = new Request('http://localhost', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Nueva Especialidad' }),
  })
  const supabase = mockSupabase()
  const res = await handleCreateSpecialty(req, supabase as unknown as SupabaseClientLike)
  assertEquals(res.status, 401)
  const body = await res.json()
  assertEquals(body.error, 'Falta token de autorización')
})

Deno.test('handleCreateSpecialty - token inválido devuelve 401', async () => {
  const req = new Request('http://localhost', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer bad-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Nueva Especialidad' }),
  })
  const supabase = mockSupabase({ authError: { message: 'Invalid token' } })
  const res = await handleCreateSpecialty(req, supabase as unknown as SupabaseClientLike)
  assertEquals(res.status, 401)
  const body = await res.json()
  assertEquals(body.error, 'Token inválido o expirado')
})

Deno.test('handleCreateSpecialty - client no puede crear especialidad devuelve 403', async () => {
  const req = new Request('http://localhost', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer valid-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Nueva Especialidad' }),
  })
  const supabase = mockSupabase({
    singleResults: [
      { data: { role: { name: 'client' } }, error: null },
    ],
  })
  const res = await handleCreateSpecialty(req, supabase as unknown as SupabaseClientLike)
  assertEquals(res.status, 403)
  const body = await res.json()
  assertEquals(body.error, 'Solo administradores pueden crear especialidades')
})

Deno.test('handleCreateSpecialty - name faltante devuelve 400', async () => {
  const req = new Request('http://localhost', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer valid-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
  const supabase = mockSupabase({
    singleResults: [
      { data: { role: { name: 'admin' } }, error: null },
    ],
  })
  const res = await handleCreateSpecialty(req, supabase as unknown as SupabaseClientLike)
  assertEquals(res.status, 400)
  const body = await res.json()
  assertEquals(body.error.includes('name'), true)
})

Deno.test('handleCreateSpecialty - error en insert devuelve 500', async () => {
  const req = new Request('http://localhost', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer valid-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Nueva Especialidad' }),
  })
  const supabase = mockSupabase({
    singleResults: [
      { data: { role: { name: 'admin' } }, error: null },
    ],
    insertError: { message: 'DB error' },
  })
  const res = await handleCreateSpecialty(req, supabase as unknown as SupabaseClientLike)
  assertEquals(res.status, 500)
  const body = await res.json()
  assertEquals(body.error, 'DB error')
})

Deno.test('handleCreateSpecialty - happy path devuelve 200', async () => {
  const req = new Request('http://localhost', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer valid-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Nueva Especialidad',
      description: 'Descripción de prueba',
      value: 5000,
      available_day: 'Lun - Vie',
      available_from: 8,
      available_until: 17,
      active: true,
    }),
  })
  const supabase = mockSupabase({
    singleResults: [
      { data: { role: { name: 'admin' } }, error: null },
      {
        data: {
          id: 'spec-new',
          name: 'Nueva Especialidad',
          description: 'Descripción de prueba',
          value: 5000,
          available_day: 'Lun - Vie',
          available_from: 8,
          available_until: 17,
          active: true,
          image: null,
        },
        error: null,
      },
    ],
  })
  const res = await handleCreateSpecialty(req, supabase as unknown as SupabaseClientLike)
  assertEquals(res.status, 200)
  const body = await res.json()
  assertEquals(body.success, true)
  assertEquals(body.specialty.name, 'Nueva Especialidad')
})

Deno.test('handleCreateSpecialty - error interno del servidor', async () => {
  const req = new Request('http://localhost', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer valid-token', 'Content-Type': 'application/json' },
    body: 'not-json',
  })
  const supabase = mockSupabase({
    singleResults: [
      { data: { role: { name: 'admin' } }, error: null },
    ],
  })
  const res = await handleCreateSpecialty(req, supabase as unknown as SupabaseClientLike)
  assertEquals(res.status, 500)
  const body = await res.json()
  assertEquals(typeof body.error, 'string')
})

Deno.test('handleCreateSpecialty - admin code no es necesario usa role de la db', async () => {
  const req = new Request('http://localhost', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer valid-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Psiquiatría' }),
  })
  const supabase = mockSupabase({
    singleResults: [
      { data: { role: { name: 'admin' } }, error: null },
      { data: { id: 'spec-psy', name: 'Psiquiatría', active: true }, error: null },
    ],
  })
  const res = await handleCreateSpecialty(req, supabase as unknown as SupabaseClientLike)
  assertEquals(res.status, 200)
  const body = await res.json()
  assertEquals(body.success, true)
})
