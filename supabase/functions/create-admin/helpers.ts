export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export function validateRequiredFields(body: Record<string, unknown>, fields: string[]): string[] {
  return fields.filter((f) => !body[f])
}

export function isValidAdminCode(code: string, secretCode: string | undefined): boolean {
  return code === secretCode
}
