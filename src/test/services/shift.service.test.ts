import { describe, it, expect, vi, beforeEach } from 'vitest'
import { supabase } from '../../lib/supabase'
import { createShift } from '../../services/shift.service'
import type { Shift } from '../../types'

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
  },
}))

type MockSupabaseFrom = ReturnType<typeof supabase.from>
type MockUserResponse = Awaited<ReturnType<typeof supabase.auth.getUser>>

const mockUser = {
  id: 'user-1',
  email: 'test@test.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2026-01-01T00:00:00Z',
}

const mockShift = (overrides?: Partial<Shift>): Shift => ({
  id: 'shift-1',
  client_id: 'user-1',
  specialty_id: 'spec-1',
  admin_id: null,
  status: 'pending',
  assigned_date: null,
  assigned_time: null,
  admin_notes: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
})

function mockInsertChain(data: unknown) {
  const single = vi.fn().mockResolvedValue({ data, error: null })
  const select = vi.fn(() => ({ single }))
  return { insert: vi.fn(() => ({ select })), select, single }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createShift', () => {
  it('creates a shift with pending status', async () => {
    const shift = mockShift()
    vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: mockUser }, error: null })
    vi.mocked(supabase.from).mockReturnValue(mockInsertChain(shift) as unknown as MockSupabaseFrom)

    const result = await createShift('spec-1')

    expect(result).toEqual(shift)
    expect(supabase.from).toHaveBeenCalledWith('shift')
  })

  it('throws when user is not authenticated', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: null }, error: null } as unknown as MockUserResponse)

    await expect(createShift('spec-1')).rejects.toThrow('Usuario no autenticado')
  })

  it('throws when supabase insert fails', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: mockUser }, error: null })
    const single = vi.fn().mockResolvedValue({ data: null, error: new Error('Database error') })
    const select = vi.fn(() => ({ single }))
    vi.mocked(supabase.from).mockReturnValue({ insert: vi.fn(() => ({ select })) } as unknown as MockSupabaseFrom)

    await expect(createShift('spec-1')).rejects.toThrow('Database error')
  })
})
