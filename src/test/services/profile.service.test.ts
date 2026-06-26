import { describe, it, expect, vi, beforeEach } from 'vitest'
import { supabase } from '../../lib/supabase'
import { getProfile, getSpecialties } from '../../services/profile.service'
import type { Profile, Specialty } from '../../types'

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
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
