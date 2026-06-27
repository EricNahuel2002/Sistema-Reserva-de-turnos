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
