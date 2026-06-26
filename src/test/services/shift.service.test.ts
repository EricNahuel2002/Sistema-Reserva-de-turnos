import { describe, it, expect, vi, beforeEach } from 'vitest'
import { supabase } from '../../lib/supabase'
import { createShift, getAllShifts } from '../../services/shift.service'
import type { Shift, ShiftWithDetails } from '../../types'

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

const mockShiftWithDetails = (overrides?: Partial<ShiftWithDetails>): ShiftWithDetails => ({
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
  client: { id: 'user-1', full_name: 'Juan Pérez', dni: '12345678' },
  specialty: { name: 'Cardiología' },
  ...overrides,
})

function mockInsertChain(data: unknown) {
  const single = vi.fn().mockResolvedValue({ data, error: null })
  const select = vi.fn(() => ({ single }))
  return { insert: vi.fn(() => ({ select })), select, single }
}

function mockSelectOrderChain(data: unknown) {
  const order = vi.fn().mockResolvedValue({ data, error: null })
  const select = vi.fn(() => ({ order }))
  return { select, order }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getAllShifts', () => {
  it('returns all shifts with client and specialty details', async () => {
    const shifts = [
      mockShiftWithDetails(),
      mockShiftWithDetails({ id: 'shift-2', client: { id: 'user-2', full_name: 'María García', dni: '87654321' }, specialty: { name: 'Dermatología' } }),
    ]
    vi.mocked(supabase.from).mockReturnValue(mockSelectOrderChain(shifts) as unknown as MockSupabaseFrom)

    const result = await getAllShifts()

    expect(result).toEqual(shifts)
    expect(supabase.from).toHaveBeenCalledWith('shift')
  })

  it('returns empty array when no shifts', async () => {
    vi.mocked(supabase.from).mockReturnValue(mockSelectOrderChain([]) as unknown as MockSupabaseFrom)

    const result = await getAllShifts()

    expect(result).toEqual([])
  })

  it('throws when supabase query fails', async () => {
    const order = vi.fn().mockResolvedValue({ data: null, error: new Error('Database error') })
    const select = vi.fn(() => ({ order }))
    vi.mocked(supabase.from).mockReturnValue({ select } as unknown as MockSupabaseFrom)

    await expect(getAllShifts()).rejects.toThrow('Database error')
  })
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
