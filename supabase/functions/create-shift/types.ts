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
  insert(data: Record<string, unknown>): InsertQuery
}

export interface SelectQuery {
  eq(col: string, val: unknown): SingleQuery
}

export interface SingleQuery {
  single(): Promise<{ data: Record<string, unknown> | null; error: unknown }>
}

export interface InsertQuery {
  select(): { single(): Promise<{ data: Record<string, unknown> | null; error: unknown }> }
}
