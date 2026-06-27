export interface SupabaseClientLike {
  auth: {
    getUser(token: string): Promise<{
      data: { user: { id: string } | null }
      error: { message: string } | null
    }>
  }
  from(table: string): FromQuery
}

interface FromQuery {
  select(columns: string, opts?: { count?: string; head?: boolean }): SelectQuery
  update(data: Record<string, unknown>): UpdateQuery
}

interface SelectQuery {
  eq(col: string, val: unknown): SingleQuery
}

interface SingleQuery {
  single(): Promise<{ data: Record<string, unknown> | null; error: unknown }>
  eq(col: string, val: unknown): CountQuery
}

interface CountQuery extends Promise<{ data: Record<string, unknown> | null; count: number | null; error: unknown }> {
  neq(col: string, val: unknown): CountQuery
}

interface UpdateQuery {
  eq(col: string, val: unknown): Promise<{ error: { message: string } | null }>
}

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DAY_OF_WEEK_MAP: Record<string, number> = {
  domingo: 0,
  lunes: 1,
  martes: 2,
  miércoles: 3,
  jueves: 4,
  viernes: 5,
  sábado: 6,
}

export function isValidTimeFormat(time: string): boolean {
  return /^([01]\d|2[0-3]):(00|30)$/.test(time)
}

export function parseTimeToDecimal(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h + m / 60
}

export function isTimeInRange(decimal: number, from: number, until: number): boolean {
  return decimal >= from && decimal < until
}

export function getDayOfWeekNumber(name: string): number | undefined {
  return DAY_OF_WEEK_MAP[name.toLowerCase()]
}

export function isCorrectDayOfWeek(dateStr: string, dayName: string): boolean {
  const allowedDayOfWeek = getDayOfWeekNumber(dayName)
  if (allowedDayOfWeek == null) return false
  const [y, m, d] = dateStr.split('-').map(Number)
  const dateObj = new Date(y, m - 1, d)
  return dateObj.getDay() === allowedDayOfWeek
}

export function validateRequiredFields(body: Record<string, unknown>, fields: string[]): string[] {
  return fields.filter((f) => !body[f])
}

export function formatRangeTime(value: number): string {
  return String(value).padStart(2, '0') + ':00'
}
