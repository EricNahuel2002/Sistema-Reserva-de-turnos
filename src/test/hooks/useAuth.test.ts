import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
    },
  },
}))

vi.mock('../../services/profile.service', () => ({
  getProfile: vi.fn(),
}))

import { getProfile } from '../../services/profile.service'

const mockUser = {
  id: 'user-1',
  email: 'test@test.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2026-01-01T00:00:00Z',
}

const mockSession = {
  user: mockUser,
  access_token: 'token',
  refresh_token: 'refresh',
  expires_in: 3600,
  token_type: 'bearer' as const,
}

const mockProfile = { id: 'user-1', full_name: 'Test', dni: '12345678', role: { name: 'client' } }

const mockSubscription = {
  id: 'sub-1',
  callback: vi.fn(),
  unsubscribe: vi.fn(),
}

const mockAuthResponse = { data: { user: mockUser, session: mockSession }, error: null }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useAuth', () => {
  it('starts with loading state', () => {
    vi.mocked(supabase.auth.getSession).mockReturnValue(new Promise(() => {}))
    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: { subscription: mockSubscription },
    })

    const { result } = renderHook(() => useAuth())

    expect(result.current.loading).toBe(true)
    expect(result.current.user).toBeNull()
    expect(result.current.session).toBeNull()
    expect(result.current.profile).toBeNull()
  })

  it('sets session and profile when session exists', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: mockSession }, error: null })
    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: { subscription: mockSubscription },
    })
    vi.mocked(getProfile).mockResolvedValue(mockProfile as any)

    const { result } = renderHook(() => useAuth())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.user?.id).toBe('user-1')
    expect(result.current.session).toEqual(mockSession)
    expect(result.current.profile).toEqual(mockProfile)
    expect(getProfile).toHaveBeenCalledWith('user-1')
  })

  it('sets user null when no session', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null }, error: null })
    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: { subscription: mockSubscription },
    })

    const { result } = renderHook(() => useAuth())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.user).toBeNull()
    expect(result.current.session).toBeNull()
    expect(result.current.profile).toBeNull()
  })

  it('updates user and profile on auth state change (login)', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null }, error: null })
    let authCallback: (event: string, session: any) => void = () => {}
    vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((callback: any) => {
      authCallback = callback
      return { data: { subscription: mockSubscription } }
    })
    vi.mocked(getProfile).mockResolvedValue(mockProfile as any)

    const { result } = renderHook(() => useAuth())

    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      authCallback('SIGNED_IN', mockSession)
    })

    expect(result.current.user?.id).toBe('user-1')
    expect(result.current.session).toEqual(mockSession)
    expect(result.current.profile).toEqual(mockProfile)
  })

  it('clears user and profile on auth state change (logout)', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: mockSession }, error: null })
    let authCallback: (event: string, session: any) => void = () => {}
    vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((callback: any) => {
      authCallback = callback
      return { data: { subscription: mockSubscription } }
    })
    vi.mocked(getProfile).mockResolvedValue(mockProfile as any)

    const { result } = renderHook(() => useAuth())

    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      authCallback('SIGNED_OUT', null)
    })

    expect(result.current.user).toBeNull()
    expect(result.current.session).toBeNull()
    expect(result.current.profile).toBeNull()
  })

  it('signUp calls supabase auth with provided data', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null }, error: null })
    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: { subscription: mockSubscription },
    })
    vi.mocked(supabase.auth.signUp).mockResolvedValue(mockAuthResponse)

    const { result } = renderHook(() => useAuth())

    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.signUp('email@test.com', 'pass123', 'Juan', '12345678')
    })

    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: 'email@test.com',
      password: 'pass123',
      options: { data: { full_name: 'Juan', dni: '12345678' } },
    })
  })

  it('signIn calls supabase auth with email and password', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null }, error: null })
    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: { subscription: mockSubscription },
    })
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue(mockAuthResponse)

    const { result } = renderHook(() => useAuth())

    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.signIn('email@test.com', 'pass123')
    })

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'email@test.com',
      password: 'pass123',
    })
  })

  it('signOut calls supabase auth signOut', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null }, error: null })
    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: { subscription: mockSubscription },
    })

    const { result } = renderHook(() => useAuth())

    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.signOut()
    })

    expect(supabase.auth.signOut).toHaveBeenCalledOnce()
  })
})
