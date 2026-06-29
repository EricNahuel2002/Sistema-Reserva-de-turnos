import { assertEquals } from 'std/testing/asserts.ts'
import { corsHeaders, validateRequiredFields } from './helpers.ts'

Deno.test('corsHeaders', async (t) => {
  await t.step('tiene Access-Control-Allow-Origin: *', () => {
    assertEquals(corsHeaders['Access-Control-Allow-Origin'], '*')
  })

  await t.step('tiene Access-Control-Allow-Headers con authorization', () => {
    const headers = corsHeaders['Access-Control-Allow-Headers']
    assertEquals(typeof headers, 'string')
    assertEquals(headers.includes('authorization'), true)
    assertEquals(headers.includes('content-type'), true)
  })
})

Deno.test('validateRequiredFields', async (t) => {
  await t.step('devuelve vacío si todos presentes', () => {
    assertEquals(validateRequiredFields({ a: 1, b: 2 }, ['a', 'b']), [])
  })

  await t.step('devuelve faltantes', () => {
    const missing = validateRequiredFields({ a: 1 }, ['a', 'b', 'c'])
    assertEquals(missing, ['b', 'c'])
  })

  await t.step('considera falsy como faltante', () => {
    const missing = validateRequiredFields({ a: 0, b: '', c: null }, ['a', 'b', 'c'])
    assertEquals(missing, ['a', 'b', 'c'])
  })

  await t.step('devuelve todos si el body está vacío', () => {
    const missing = validateRequiredFields({}, ['name', 'description'])
    assertEquals(missing, ['name', 'description'])
  })
})
