import { assertEquals } from 'std/testing/asserts.ts'
import { handleCreateClient } from './handler.ts'
import type { SupabaseClientLike } from './types.ts'

Deno.test('handleCreateClient - CORS preflight', async () => {
  const req = new Request('http://localhost', { method: 'OPTIONS' })
  const res = await handleCreateClient(req)
  assertEquals(res.status, 200)
  assertEquals(res.headers.get('Access-Control-Allow-Origin'), '*')
})

Deno.test('handleCreateClient - method not allowed', async () => {
  const req = new Request('http://localhost', { method: 'GET' })
  const res = await handleCreateClient(req)
  assertEquals(res.status, 405)
  const body = await res.json()
  assertEquals(body.error, 'Method not allowed')
})

Deno.test('handleCreateClient - campos obligatorios faltantes', async () => {
  const req = new Request('http://localhost', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
  const res = await handleCreateClient(req)
  assertEquals(res.status, 400)
  const body = await res.json()
  assertEquals(body.error.includes('email'), true)
  assertEquals(body.error.includes('password'), true)
  assertEquals(body.error.includes('full_name'), true)
  assertEquals(body.error.includes('dni'), true)
})

Deno.test('handleCreateClient - email inválido', async () => {
  const req = new Request('http://localhost', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'invalido', password: '123456', full_name: 'Test User', dni: '12345678' }),
  })
  const res = await handleCreateClient(req)
  assertEquals(res.status, 400)
  const body = await res.json()
  assertEquals(body.error, 'El email no tiene un formato válido')
})

Deno.test('handleCreateClient - password muy corta', async () => {
  const req = new Request('http://localhost', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@test.com', password: '123', full_name: 'Test User', dni: '12345678' }),
  })
  const res = await handleCreateClient(req)
  assertEquals(res.status, 400)
  const body = await res.json()
  assertEquals(body.error, 'La contraseña debe tener al menos 6 caracteres')
})

Deno.test('handleCreateClient - nombre muy corto', async () => {
  const req = new Request('http://localhost', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@test.com', password: '123456', full_name: 'ab', dni: '12345678' }),
  })
  const res = await handleCreateClient(req)
  assertEquals(res.status, 400)
  const body = await res.json()
  assertEquals(body.error, 'El nombre debe tener al menos 3 caracteres y solo letras')
})

Deno.test('handleCreateClient - nombre con caracteres inválidos', async () => {
  const req = new Request('http://localhost', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@test.com', password: '123456', full_name: 'Test123', dni: '12345678' }),
  })
  const res = await handleCreateClient(req)
  assertEquals(res.status, 400)
  const body = await res.json()
  assertEquals(body.error, 'El nombre debe tener al menos 3 caracteres y solo letras')
})

Deno.test('handleCreateClient - dni no numérico', async () => {
  const req = new Request('http://localhost', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@test.com', password: '123456', full_name: 'Test User', dni: 'abcdef' }),
  })
  const res = await handleCreateClient(req)
  assertEquals(res.status, 400)
  const body = await res.json()
  assertEquals(body.error, 'El DNI debe tener entre 7 y 8 dígitos numéricos')
})

Deno.test('handleCreateClient - dni longitud inválida', async () => {
  const req = new Request('http://localhost', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@test.com', password: '123456', full_name: 'Test User', dni: '123' }),
  })
  const res = await handleCreateClient(req)
  assertEquals(res.status, 400)
  const body = await res.json()
  assertEquals(body.error, 'El DNI debe tener entre 7 y 8 dígitos numéricos')
})

Deno.test('handleCreateClient - error en createUser', async () => {
  const req = new Request('http://localhost', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@test.com', password: '123456', full_name: 'Test User', dni: '12345678' }),
  })
  const supabase = {
    auth: {
      admin: {
        createUser: () => ({ data: null, error: { message: 'Email already registered' } }),
      },
    },
    from: () => ({ select: () => ({ eq: () => ({ single: () => ({}) }) }) }),
  }
  const res = await handleCreateClient(req, supabase as unknown as SupabaseClientLike)
  assertEquals(res.status, 400)
  const body = await res.json()
  assertEquals(body.error, 'Email already registered')
})

Deno.test('handleCreateClient - error sin userData', async () => {
  const req = new Request('http://localhost', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@test.com', password: '123456', full_name: 'Test User', dni: '12345678' }),
  })
  const supabase = {
    auth: {
      admin: {
        createUser: () => ({ data: null, error: null }),
      },
    },
    from: () => ({ select: () => ({ eq: () => ({ single: () => ({}) }) }) }),
  }
  const res = await handleCreateClient(req, supabase as unknown as SupabaseClientLike)
  assertEquals(res.status, 500)
  const body = await res.json()
  assertEquals(body.error, 'Error al crear el usuario')
})

Deno.test('handleCreateClient - happy path devuelve 200', async () => {
  const req = new Request('http://localhost', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'client@test.com', password: 'secure123', full_name: 'Test Client', dni: '12345678' }),
  })
  const supabase = {
    auth: {
      admin: {
        createUser: () => ({ data: { user: { id: 'new-uid' } }, error: null }),
      },
    },
    from: () => ({ select: () => ({ eq: () => ({ single: () => ({}) }) }) }),
  }
  const res = await handleCreateClient(req, supabase as unknown as SupabaseClientLike)
  assertEquals(res.status, 200)
  const body = await res.json()
  assertEquals(body.success, true)
})
