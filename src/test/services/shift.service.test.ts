import { describe, it, expect, vi, beforeEach } from 'vitest'
import { supabase } from '../../lib/supabase'
import { createShift, getAllShifts, assignShift, getShiftsByDateRange, getClientShifts, getPendingShiftsCount, getTodayShiftsCount, getApprovedShiftsCount } from '../../services/shift.service'
import type { Shift, ShiftWithDetails } from '../../types'

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
    functions: { invoke: vi.fn() },
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
  specialty: { name: 'Cardiología', available_from: 8, available_until: 17, available_day: 'lunes' },
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
      mockShiftWithDetails({ id: 'shift-2', client: { id: 'user-2', full_name: 'María García', dni: '87654321' }, specialty: { name: 'Dermatología', available_from: 9, available_until: 15, available_day: 'martes' } }),
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

describe('assignShift', () => {
  it('invokes assign-shift edge function with correct body', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: { success: true }, error: null })

    const result = await assignShift('shift-1', '2026-07-15', '10:00')

    expect(result).toEqual({ success: true })
    expect(supabase.functions.invoke).toHaveBeenCalledWith('assign-shift', {
      body: { shift_id: 'shift-1', assigned_date: '2026-07-15', assigned_time: '10:00' },
    })
  })

  it('throws when edge function returns an error with context body', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: {
        message: 'Failed to invoke function',
        context: { status: 409, body: { error: 'El horario ya está ocupado' } },
      },
    })

    await expect(assignShift('shift-1', '2026-07-15', '10:00')).rejects.toThrow('El horario ya está ocupado')
  })

  it('falls back to error.message when context.body.error is missing', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: { message: 'Network error' },
    })

    await expect(assignShift('shift-1', '2026-07-15', '10:00')).rejects.toThrow('Network error')
  })
})

describe('getShiftsByDateRange', () => {
  function createMockChain(opts: { data?: unknown; error?: Error | null }) {
    const error = opts.error ?? null
    const data = error ? null : (opts.data ?? null)
    const resolveValue = { data, error }

    const chain: Record<string, unknown> = {
      then: (resolve: (v: unknown) => void) => resolve(resolveValue),
    }
    chain.select = vi.fn(() => chain)
    chain.gte = vi.fn(() => chain)
    chain.lte = vi.fn(() => chain)
    chain.neq = vi.fn(() => chain)
    chain.not = vi.fn(() => chain)
    chain.order = vi.fn(() => chain)
    return chain
  }

  it('returns shifts within the given date range', async () => {
    const shifts = [
      mockShiftWithDetails({
        id: 'shift-1',
        assigned_date: '2026-07-15',
        assigned_time: '10:00',
        status: 'approved',
      }),
      mockShiftWithDetails({
        id: 'shift-2',
        assigned_date: '2026-07-16',
        assigned_time: '11:00',
        status: 'approved',
      }),
    ]

    vi.mocked(supabase.from).mockReturnValue(createMockChain({ data: shifts }) as unknown as MockSupabaseFrom)

    const result = await getShiftsByDateRange('2026-07-01', '2026-07-31')

    expect(result).toEqual(shifts)
    expect(supabase.from).toHaveBeenCalledWith('shift')
  })

  it('returns empty array when no shifts in range', async () => {
    vi.mocked(supabase.from).mockReturnValue(createMockChain({ data: [] }) as unknown as MockSupabaseFrom)

    const result = await getShiftsByDateRange('2026-08-01', '2026-08-31')

    expect(result).toEqual([])
  })

  it('throws when supabase query fails', async () => {
    vi.mocked(supabase.from).mockReturnValue(
      createMockChain({ error: new Error('Database error') }) as unknown as MockSupabaseFrom,
    )

    await expect(getShiftsByDateRange('2026-07-01', '2026-07-31')).rejects.toThrow('Database error')
  })
})

describe('getPendingShiftsCount', () => {
  it('returns the count of pending shifts', async () => {
    const count = 5
    const eq = vi.fn().mockResolvedValue({ count, data: null, error: null })
    vi.mocked(supabase.from).mockReturnValue({ select: vi.fn(() => ({ eq })) } as unknown as MockSupabaseFrom)

    const result = await getPendingShiftsCount()

    expect(result).toBe(5)
    expect(supabase.from).toHaveBeenCalledWith('shift')
  })

  it('returns 0 when no pending shifts', async () => {
    const eq = vi.fn().mockResolvedValue({ count: 0, data: null, error: null })
    vi.mocked(supabase.from).mockReturnValue({ select: vi.fn(() => ({ eq })) } as unknown as MockSupabaseFrom)

    const result = await getPendingShiftsCount()

    expect(result).toBe(0)
  })

  it('throws when supabase query fails', async () => {
    const eq = vi.fn().mockResolvedValue({ count: null, data: null, error: new Error('Database error') })
    vi.mocked(supabase.from).mockReturnValue({ select: vi.fn(() => ({ eq })) } as unknown as MockSupabaseFrom)

    await expect(getPendingShiftsCount()).rejects.toThrow('Database error')
  })
})

describe('getApprovedShiftsCount', () => {
  it('returns the count of approved shifts', async () => {
    const count = 7
    const eq = vi.fn().mockResolvedValue({ count, data: null, error: null })
    vi.mocked(supabase.from).mockReturnValue({ select: vi.fn(() => ({ eq })) } as unknown as MockSupabaseFrom)

    const result = await getApprovedShiftsCount()

    expect(result).toBe(7)
    expect(supabase.from).toHaveBeenCalledWith('shift')
  })

  it('returns 0 when no approved shifts', async () => {
    const eq = vi.fn().mockResolvedValue({ count: 0, data: null, error: null })
    vi.mocked(supabase.from).mockReturnValue({ select: vi.fn(() => ({ eq })) } as unknown as MockSupabaseFrom)

    const result = await getApprovedShiftsCount()

    expect(result).toBe(0)
  })

  it('throws when supabase query fails', async () => {
    const eq = vi.fn().mockResolvedValue({ count: null, data: null, error: new Error('Database error') })
    vi.mocked(supabase.from).mockReturnValue({ select: vi.fn(() => ({ eq })) } as unknown as MockSupabaseFrom)

    await expect(getApprovedShiftsCount()).rejects.toThrow('Database error')
  })
})

describe('getTodayShiftsCount', () => {
  it('returns the count of today shifts', async () => {
    const count = 3
    const neq = vi.fn().mockResolvedValue({ count, data: null, error: null })
    const eq = vi.fn(() => ({ neq }))
    vi.mocked(supabase.from).mockReturnValue({ select: vi.fn(() => ({ eq })) } as unknown as MockSupabaseFrom)

    const result = await getTodayShiftsCount()

    expect(result).toBe(3)
    expect(supabase.from).toHaveBeenCalledWith('shift')
  })

  it('returns 0 when no shifts today', async () => {
    const neq = vi.fn().mockResolvedValue({ count: 0, data: null, error: null })
    const eq = vi.fn(() => ({ neq }))
    vi.mocked(supabase.from).mockReturnValue({ select: vi.fn(() => ({ eq })) } as unknown as MockSupabaseFrom)

    const result = await getTodayShiftsCount()

    expect(result).toBe(0)
  })

  it('throws when supabase query fails', async () => {
    const neq = vi.fn().mockResolvedValue({ count: null, data: null, error: new Error('Database error') })
    const eq = vi.fn(() => ({ neq }))
    vi.mocked(supabase.from).mockReturnValue({ select: vi.fn(() => ({ eq })) } as unknown as MockSupabaseFrom)

    await expect(getTodayShiftsCount()).rejects.toThrow('Database error')
  })
})

describe('getClientShifts', () => {
  function createMockChain(opts: { data?: unknown; error?: Error | null }) {
    const error = opts.error ?? null
    const data = error ? null : (opts.data ?? null)
    const resolveValue = { data, error }

    const chain: Record<string, unknown> = {
      then: (resolve: (v: unknown) => void) => resolve(resolveValue),
    }
    chain.select = vi.fn(() => chain)
    chain.eq = vi.fn(() => chain)
    chain.neq = vi.fn(() => chain)
    chain.not = vi.fn(() => chain)
    chain.order = vi.fn(() => chain)
    return chain
  }

  it('returns client shifts with details', async () => {
    const shifts = [
      mockShiftWithDetails({
        id: 'shift-1',
        assigned_date: '2026-07-15',
        assigned_time: '10:00',
        status: 'approved',
      }),
      mockShiftWithDetails({
        id: 'shift-2',
        assigned_date: '2026-07-20',
        assigned_time: '14:30',
        status: 'approved',
        specialty: { name: 'Dermatología', available_from: 9, available_until: 15, available_day: 'martes' },
      }),
    ]

    vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: mockUser }, error: null })
    vi.mocked(supabase.from).mockReturnValue(createMockChain({ data: shifts }) as unknown as MockSupabaseFrom)

    const result = await getClientShifts()

    expect(result).toEqual(shifts)
    expect(supabase.from).toHaveBeenCalledWith('shift')
  })

  it('returns empty array when client has no shifts', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: mockUser }, error: null })
    vi.mocked(supabase.from).mockReturnValue(createMockChain({ data: [] }) as unknown as MockSupabaseFrom)

    const result = await getClientShifts()

    expect(result).toEqual([])
  })

  it('throws when user is not authenticated', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: null }, error: null } as unknown as MockUserResponse)

    await expect(getClientShifts()).rejects.toThrow('Usuario no autenticado')
  })

  it('throws when supabase query fails', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: mockUser }, error: null })
    vi.mocked(supabase.from).mockReturnValue(
      createMockChain({ error: new Error('Database error') }) as unknown as MockSupabaseFrom,
    )

    await expect(getClientShifts()).rejects.toThrow('Database error')
  })
})
