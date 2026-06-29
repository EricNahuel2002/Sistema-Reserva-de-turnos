import { describe, it, expect, vi, beforeEach } from 'vitest'
import { supabase } from '../../lib/supabase'
import { getProfile, getSpecialties, getSpecialtiesCount, getAllSpecialties, createSpecialty } from '../../services/profile.service'
import type { Profile, Specialty } from '../../types'

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    functions: {
      invoke: vi.fn(),
    },
  },
}))

type MockSupabaseFrom = ReturnType<typeof supabase.from>

const mockProfile = (overrides?: Partial<Profile>): Profile => ({
  id: 'user-1',
  role_id: 'role-1',
  role: { name: 'client' },
  full_name: 'Juan Pérez',
  dni: '12345678',
  phone: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
})

const mockSpecialty = (overrides?: Partial<Specialty>): Specialty => ({
  id: 'spec-1',
  name: 'Cardiología',
  description: 'Descripción',
  active: true,
  created_at: '2026-01-01T00:00:00Z',
  available_from: 9,
  available_until: 17,
  available_day: 'Lunes',
  image: null,
  value: 5000,
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getProfile', () => {
  it('returns profile when found', async () => {
    const profile = mockProfile()
    const single = vi.fn().mockResolvedValue({ data: profile, error: null })
    const eq = vi.fn(() => ({ single }))
    vi.mocked(supabase.from).mockReturnValue({ select: vi.fn(() => ({ eq })) } as unknown as MockSupabaseFrom)

    const result = await getProfile('user-1')

    expect(result).toEqual(profile)
    expect(supabase.from).toHaveBeenCalledWith('profile')
  })

  it('returns null when not found', async () => {
    const single = vi.fn().mockResolvedValue({ data: null, error: null })
    const eq = vi.fn(() => ({ single }))
    vi.mocked(supabase.from).mockReturnValue({ select: vi.fn(() => ({ eq })) } as unknown as MockSupabaseFrom)

    const result = await getProfile('user-1')

    expect(result).toBeNull()
  })
})

describe('getSpecialtiesCount', () => {
  it('returns the count of active specialties', async () => {
    const count = 6
    const eq = vi.fn().mockResolvedValue({ count, data: null, error: null })
    vi.mocked(supabase.from).mockReturnValue({ select: vi.fn(() => ({ eq })) } as unknown as MockSupabaseFrom)

    const result = await getSpecialtiesCount()

    expect(result).toBe(6)
    expect(supabase.from).toHaveBeenCalledWith('specialty')
  })

  it('returns 0 when no active specialties', async () => {
    const eq = vi.fn().mockResolvedValue({ count: 0, data: null, error: null })
    vi.mocked(supabase.from).mockReturnValue({ select: vi.fn(() => ({ eq })) } as unknown as MockSupabaseFrom)

    const result = await getSpecialtiesCount()

    expect(result).toBe(0)
  })

  it('throws when supabase query fails', async () => {
    const eq = vi.fn().mockResolvedValue({ count: null, data: null, error: new Error('Database error') })
    vi.mocked(supabase.from).mockReturnValue({ select: vi.fn(() => ({ eq })) } as unknown as MockSupabaseFrom)

    await expect(getSpecialtiesCount()).rejects.toThrow('Database error')
  })
})

describe('getSpecialties', () => {
  it('returns active specialties', async () => {
    const specialties = [mockSpecialty(), mockSpecialty({ id: 'spec-2', name: 'Dermatología' })]
    const order = vi.fn().mockResolvedValue({ data: specialties, error: null })
    const eq = vi.fn(() => ({ order }))
    vi.mocked(supabase.from).mockReturnValue({ select: vi.fn(() => ({ eq })) } as unknown as MockSupabaseFrom)

    const result = await getSpecialties()

    expect(result).toEqual(specialties)
    expect(supabase.from).toHaveBeenCalledWith('specialty')
  })

  it('returns empty array when no specialties', async () => {
    const order = vi.fn().mockResolvedValue({ data: [], error: null })
    const eq = vi.fn(() => ({ order }))
    vi.mocked(supabase.from).mockReturnValue({ select: vi.fn(() => ({ eq })) } as unknown as MockSupabaseFrom)

    const result = await getSpecialties()

    expect(result).toEqual([])
  })
})

describe('getAllSpecialties', () => {
  it('returns all specialties without active filter', async () => {
    const specialties = [
      mockSpecialty(),
      mockSpecialty({ id: 'spec-2', name: 'Dermatología', active: false }),
    ]
    const order = vi.fn().mockResolvedValue({ data: specialties, error: null })
    vi.mocked(supabase.from).mockReturnValue({ select: vi.fn(() => ({ order })) } as unknown as MockSupabaseFrom)

    const result = await getAllSpecialties()

    expect(result).toEqual(specialties)
    expect(supabase.from).toHaveBeenCalledWith('specialty')
  })

  it('returns empty array when no specialties', async () => {
    const order = vi.fn().mockResolvedValue({ data: [], error: null })
    vi.mocked(supabase.from).mockReturnValue({ select: vi.fn(() => ({ order })) } as unknown as MockSupabaseFrom)

    const result = await getAllSpecialties()

    expect(result).toEqual([])
  })
})

describe('createSpecialty', () => {
  const mockSpecialtyData = {
    name: 'Nueva Especialidad',
    description: 'Descripción',
    value: 5000,
    available_day: 'Lun - Vie',
    available_from: 8,
    available_until: 17,
    image: null,
    active: true,
  }

  it('returns success on happy path', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: { success: true }, error: null })

    const result = await createSpecialty(mockSpecialtyData)

    expect(result).toEqual({ success: true })
    expect(supabase.functions.invoke).toHaveBeenCalledWith('create-specialty', {
      body: mockSpecialtyData,
    })
  })

  it('throws when invoke fails with context body error', async () => {
    const invokeError = {
      context: { body: { error: 'Solo administradores pueden crear especialidades' } },
      message: 'Forbidden',
    }
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: null, error: invokeError })

    await expect(createSpecialty(mockSpecialtyData)).rejects.toThrow(
      'Solo administradores pueden crear especialidades',
    )
  })

  it('throws with generic message when no context body', async () => {
    const invokeError = new Error('Network error')
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: null, error: invokeError })

    await expect(createSpecialty(mockSpecialtyData)).rejects.toThrow('Network error')
  })
})
