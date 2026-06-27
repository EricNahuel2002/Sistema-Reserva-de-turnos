import { assertEquals } from 'std/testing/asserts.ts'
import { validateRequiredFields, isValidAdminCode } from './helpers.ts'

Deno.test('validateRequiredFields', async (t) => {
  await t.step('devuelve vacío si todos presentes', () => {
    assertEquals(validateRequiredFields({ a: 1, b: 2 }, ['a', 'b']), [])
  })

  await t.step('devuelve faltantes', () => {
    const missing = validateRequiredFields({ email: 'test@test.com' }, ['email', 'password', 'full_name'])
    assertEquals(missing, ['password', 'full_name'])
  })

  await t.step('considera falsy como faltante', () => {
    const missing = validateRequiredFields({ email: '', password: null }, ['email', 'password'])
    assertEquals(missing, ['email', 'password'])
  })
})

Deno.test('isValidAdminCode', async (t) => {
  await t.step('código correcto devuelve true', () => {
    assertEquals(isValidAdminCode('secret123', 'secret123'), true)
  })

  await t.step('código incorrecto devuelve false', () => {
    assertEquals(isValidAdminCode('wrong', 'secret123'), false)
  })

  await t.step('secret undefined devuelve false', () => {
    assertEquals(isValidAdminCode('anything', undefined), false)
  })
})
