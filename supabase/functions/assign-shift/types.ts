export interface SupabaseClientLike {
  auth: {
    getUser(token: string): Promise<{
      data: { user: { id: string } | null }
      error: { message: string } | null
    }>
  }
  from(table: string): FromQuery
}

export interface FromQuery {
  select(columns: string, opts?: { count?: string; head?: boolean }): SelectQuery
  update(data: Record<string, unknown>): UpdateQuery
}

export interface SelectQuery {
  eq(col: string, val: unknown): SingleQuery
}

export interface SingleQuery {
  single(): Promise<{ data: Record<string, unknown> | null; error: unknown }>
  eq(col: string, val: unknown): CountQuery
}

export interface CountQuery extends Promise<{ data: Record<string, unknown> | null; count: number | null; error: unknown }> {
  neq(col: string, val: unknown): CountQuery
}

export interface UpdateQuery {
  eq(col: string, val: unknown): Promise<{ error: { message: string } | null }>
}
