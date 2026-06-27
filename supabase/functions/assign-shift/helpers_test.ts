import { assertEquals, assertExists } from 'std/testing/asserts.ts'
import {
  isValidTimeFormat,
  parseTimeToDecimal,
  isTimeInRange,
  getDayOfWeekNumber,
  isCorrectDayOfWeek,
  validateRequiredFields,
  formatRangeTime,
} from './helpers.ts'

Deno.test('isValidTimeFormat', async (t) => {
  await t.step('acepta HH:00', () => {
    assertEquals(isValidTimeFormat('08:00'), true)
    assertEquals(isValidTimeFormat('00:00'), true)
    assertEquals(isValidTimeFormat('23:00'), true)
  })

  await t.step('acepta HH:30', () => {
    assertEquals(isValidTimeFormat('08:30'), true)
    assertEquals(isValidTimeFormat('00:30'), true)
    assertEquals(isValidTimeFormat('23:30'), true)
  })

  await t.step('rechaza minutos no redondos', () => {
    assertEquals(isValidTimeFormat('08:15'), false)
    assertEquals(isValidTimeFormat('08:45'), false)
    assertEquals(isValidTimeFormat('08:01'), false)
  })

  await t.step('rechaza hora inválida (24+)', () => {
    assertEquals(isValidTimeFormat('24:00'), false)
    assertEquals(isValidTimeFormat('25:30'), false)
  })

  await t.step('rechaza formato sin leading zero', () => {
    assertEquals(isValidTimeFormat('8:00'), false)
    assertEquals(isValidTimeFormat('8:30'), false)
  })

  await t.step('rechaza string vacío y basura', () => {
    assertEquals(isValidTimeFormat(''), false)
    assertEquals(isValidTimeFormat('abc'), false)
    assertEquals(isValidTimeFormat('12:00:00'), false)
  })
})

Deno.test('parseTimeToDecimal', async (t) => {
  await t.step('convierte HH:00 a entero', () => {
    assertEquals(parseTimeToDecimal('08:00'), 8)
    assertEquals(parseTimeToDecimal('00:00'), 0)
    assertEquals(parseTimeToDecimal('23:00'), 23)
  })

  await t.step('convierte HH:30 a decimal .5', () => {
    assertEquals(parseTimeToDecimal('08:30'), 8.5)
    assertEquals(parseTimeToDecimal('00:30'), 0.5)
    assertEquals(parseTimeToDecimal('23:30'), 23.5)
  })
})

Deno.test('isTimeInRange', async (t) => {
  await t.step('incluye extremo inferior', () => {
    assertEquals(isTimeInRange(8, 8, 17), true)
  })

  await t.step('excluye extremo superior', () => {
    assertEquals(isTimeInRange(17, 8, 17), false)
  })

  await t.step('dentro del rango', () => {
    assertEquals(isTimeInRange(10, 8, 17), true)
    assertEquals(isTimeInRange(12.5, 8, 17), true)
  })

  await t.step('fuera del rango por debajo', () => {
    assertEquals(isTimeInRange(7, 8, 17), false)
    assertEquals(isTimeInRange(0, 8, 17), false)
  })

  await t.step('fuera del rango por encima', () => {
    assertEquals(isTimeInRange(18, 8, 17), false)
    assertEquals(isTimeInRange(23.5, 8, 17), false)
  })
})

Deno.test('getDayOfWeekNumber', async (t) => {
  await t.step('mapea días en español correctamente', () => {
    assertEquals(getDayOfWeekNumber('domingo'), 0)
    assertEquals(getDayOfWeekNumber('lunes'), 1)
    assertEquals(getDayOfWeekNumber('martes'), 2)
    assertEquals(getDayOfWeekNumber('miércoles'), 3)
    assertEquals(getDayOfWeekNumber('jueves'), 4)
    assertEquals(getDayOfWeekNumber('viernes'), 5)
    assertEquals(getDayOfWeekNumber('sábado'), 6)
  })

  await t.step('tolera mayúsculas/minúsculas', () => {
    assertEquals(getDayOfWeekNumber('LUNES'), 1)
    assertEquals(getDayOfWeekNumber('Lunes'), 1)
    assertEquals(getDayOfWeekNumber('Sábado'), 6)
  })

  await t.step('devuelve undefined para día inválido', () => {
    assertEquals(getDayOfWeekNumber(''), undefined)
    assertEquals(getDayOfWeekNumber('unknown'), undefined)
    assertEquals(getDayOfWeekNumber('123'), undefined)
  })
})

Deno.test('isCorrectDayOfWeek', async (t) => {
  await t.step('sábado 2026-06-27 coincide con sábado', () => {
    assertEquals(isCorrectDayOfWeek('2026-06-27', 'sábado'), true)
  })

  await t.step('sábado 2026-06-27 no coincide con domingo', () => {
    assertEquals(isCorrectDayOfWeek('2026-06-27', 'domingo'), false)
  })

  await t.step('lunes 2026-06-29 coincide con lunes', () => {
    assertEquals(isCorrectDayOfWeek('2026-06-29', 'lunes'), true)
  })

  await t.step('lunes 2026-06-29 no coincide con martes', () => {
    assertEquals(isCorrectDayOfWeek('2026-06-29', 'martes'), false)
  })

  await t.step('devuelve false si el día es inválido', () => {
    assertEquals(isCorrectDayOfWeek('2026-06-27', 'unknown'), false)
  })

  await t.step('cruza boundary de mes', () => {
    assertEquals(isCorrectDayOfWeek('2026-06-30', 'martes'), true)
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
})

Deno.test('formatRangeTime', async (t) => {
  await t.step('formatea número entero a HH:00', () => {
    assertEquals(formatRangeTime(8), '08:00')
    assertEquals(formatRangeTime(0), '00:00')
    assertEquals(formatRangeTime(23), '23:00')
  })
})
