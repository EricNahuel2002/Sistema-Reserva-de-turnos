export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export function validateRequiredFields(body: Record<string, unknown>, fields: string[]): string[] {
  return fields.filter((f) => !body[f])
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function isValidPassword(password: string): boolean {
  return password.length >= 6
}

export function isValidFullName(name: string): boolean {
  return name.length >= 3 && /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(name)
}

export function isValidDni(dni: string): boolean {
  return /^\d{7,8}$/.test(dni)
}
