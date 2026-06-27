export interface SupabaseClientLike {
  auth: {
    admin: {
      createUser(data: {
        email: string
        password: string
        email_confirm: boolean
        user_metadata: Record<string, string>
      }): Promise<{
        data: { user: { id: string } } | null
        error: { message: string } | null
      }>
    }
  }
  from(table: string): {
    select(columns: string): {
      eq(col: string, val: unknown): {
        single(): Promise<{ data: Record<string, unknown> | null; error: unknown }>
      }
    }
    update(data: Record<string, unknown>): {
      eq(col: string, val: unknown): Promise<{ error: { message: string } | null }>
    }
  }
}

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
