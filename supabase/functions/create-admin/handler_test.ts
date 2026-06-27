import { assertEquals } from 'std/testing/asserts.ts'
import { handleCreateAdmin } from './handler.ts'
import type { SupabaseClientLike } from './types.ts'

Deno.test('handleCreateAdmin - CORS preflight', async () => {
  const req = new Request('http://localhost', { method: 'OPTIONS' })
  const res = await handleCreateAdmin(req)
  assertEquals(res.status, 200)
  assertEquals(res.headers.get('Access-Control-Allow-Origin'), '*')
})

Deno.test('handleCreateAdmin - method not allowed', async () => {
  const req = new Request('http://localhost', { method: 'GET' })
  const res = await handleCreateAdmin(req)
  assertEquals(res.status, 405)
  const body = await res.json()
  assertEquals(body.error, 'Method not allowed')
})

Deno.test('handleCreateAdmin - campos obligatorios faltantes', async () => {
  const req = new Request('http://localhost', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
  const res = await handleCreateAdmin(req)
  assertEquals(res.status, 400)
  const body = await res.json()
  assertEquals(body.error.includes('email'), true)
  assertEquals(body.error.includes('password'), true)
})

Deno.test('handleCreateAdmin - código admin incorrecto', async () => {
  Deno.env.set('ADMIN_SECRET_CODE', 'real-secret')
  const req = new Request('http://localhost', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'a@b.com', password: '123456', full_name: 'Test', dni: '12345', admin_code: 'wrong' }),
  })
  const res = await handleCreateAdmin(req)
  assertEquals(res.status, 403)
  const body = await res.json()
  assertEquals(body.error, 'Código de administrador inválido')
})

Deno.test('handleCreateAdmin - error en signUp', async () => {
  Deno.env.set('ADMIN_SECRET_CODE', 'secret')
  const req = new Request('http://localhost', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'a@b.com', password: '123456', full_name: 'Test', dni: '12345', admin_code: 'secret' }),
  })
  const supabase = {
    auth: {
      admin: {
        createUser: () => ({ data: null, error: { message: 'Email already registered' } }),
      },
    },
    from: () => ({ select: () => ({ eq: () => ({ single: () => ({}) }) }) }),
  }
  const res = await handleCreateAdmin(req, supabase as unknown as SupabaseClientLike)
  assertEquals(res.status, 400)
  const body = await res.json()
  assertEquals(body.error, 'Email already registered')
})

Deno.test('handleCreateAdmin - rol admin no encontrado', async () => {
  Deno.env.set('ADMIN_SECRET_CODE', 'secret')
  const req = new Request('http://localhost', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'a@b.com', password: '123456', full_name: 'Test', dni: '12345', admin_code: 'secret' }),
  })
  const supabase = {
    auth: {
      admin: {
        createUser: () => ({ data: { user: { id: 'new-uid' } }, error: null }),
      },
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => ({ data: null, error: null }),
        }),
      }),
    }),
  }
  const res = await handleCreateAdmin(req, supabase as unknown as SupabaseClientLike)
  assertEquals(res.status, 500)
  const body = await res.json()
  assertEquals(body.error, 'Rol admin no encontrado en la base de datos')
})

Deno.test('handleCreateAdmin - error al actualizar profile', async () => {
  Deno.env.set('ADMIN_SECRET_CODE', 'secret')
  const req = new Request('http://localhost', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'a@b.com', password: '123456', full_name: 'Test', dni: '12345', admin_code: 'secret' }),
  })
  const supabase = {
    auth: {
      admin: {
        createUser: () => ({ data: { user: { id: 'new-uid' } }, error: null }),
      },
    },
    from: () => {
      let isProfileQuery = false
      return {
        select: () => ({
          eq: () => ({
            single: () => ({ data: { id: 1 }, error: null }),
          }),
        }),
        update: () => ({
          eq: () => ({ error: { message: 'Update failed' } }),
        }),
      }
    },
  }
  const res = await handleCreateAdmin(req, supabase as unknown as SupabaseClientLike)
  assertEquals(res.status, 500)
  const body = await res.json()
  assertEquals(body.error, 'Update failed')
})

Deno.test('handleCreateAdmin - happy path devuelve 200', async () => {
  Deno.env.set('ADMIN_SECRET_CODE', 'secret')
  const req = new Request('http://localhost', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@test.com', password: 'secure123', full_name: 'Admin User', dni: '12345678', admin_code: 'secret' }),
  })
  const supabase = {
    auth: {
      admin: {
        createUser: () => ({ data: { user: { id: 'new-uid' } }, error: null }),
      },
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => ({ data: { id: 1 }, error: null }),
        }),
      }),
      update: () => ({
        eq: () => ({ error: null }),
      }),
    }),
  }
  const res = await handleCreateAdmin(req, supabase as unknown as SupabaseClientLike)
  assertEquals(res.status, 200)
  const body = await res.json()
  assertEquals(body.success, true)
})
