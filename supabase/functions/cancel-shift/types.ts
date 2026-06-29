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
  select(columns: string): SelectQuery
  update(data: Record<string, unknown>): UpdateQuery
}

export interface SelectQuery {
  eq(col: string, val: unknown): SingleQuery
}

export interface SingleQuery {
  single(): Promise<{ data: Record<string, unknown> | null; error: unknown }>
}

export interface UpdateQuery {
  eq(col: string, val: unknown): Promise<{ error: { message: string } | null }>
}
