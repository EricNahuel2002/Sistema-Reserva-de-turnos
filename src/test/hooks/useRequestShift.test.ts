import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useRequestShift } from '../../hooks/useRequestShift'

const mockCreateShift = vi.fn()
vi.mock('../../services/shift.service', () => ({
  createShift: (...args: unknown[]) => mockCreateShift(...args),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useRequestShift', () => {
  it('starts with default state', () => {
    const { result } = renderHook(() => useRequestShift())

    expect(result.current.submitting).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.successMessage).toBeNull()
  })

  it('sets successMessage on successful request', async () => {
    mockCreateShift.mockResolvedValue({} as never)

    const { result } = renderHook(() => useRequestShift())

    await act(async () => {
      await result.current.requestAppointment('spec-1')
    })

    expect(result.current.submitting).toBe(false)
    expect(result.current.successMessage).toBe('Turno solicitado con éxito')
    expect(result.current.error).toBeNull()
    expect(mockCreateShift).toHaveBeenCalledWith('spec-1')
  })

  it('sets submitting to true during the request', async () => {
    let resolve: () => void = () => {}
    mockCreateShift.mockReturnValue(new Promise<void>((r) => { resolve = r }))

    const { result } = renderHook(() => useRequestShift())

    act(() => { result.current.requestAppointment('spec-1') })

    expect(result.current.submitting).toBe(true)

    await act(async () => { resolve() })
    await waitFor(() => expect(result.current.submitting).toBe(false))
  })

  it('sets error message when createShift throws an Error', async () => {
    mockCreateShift.mockRejectedValue(new Error('El turno ya existe'))

    const { result } = renderHook(() => useRequestShift())

    await act(async () => {
      await result.current.requestAppointment('spec-1')
    })

    expect(result.current.submitting).toBe(false)
    expect(result.current.error).toBe('El turno ya existe')
    expect(result.current.successMessage).toBeNull()
  })

  it('uses fallback error when thrown value is not an Error instance', async () => {
    mockCreateShift.mockRejectedValue('Algo salió mal')

    const { result } = renderHook(() => useRequestShift())

    await act(async () => {
      await result.current.requestAppointment('spec-1')
    })

    expect(result.current.submitting).toBe(false)
    expect(result.current.error).toBe('Error al solicitar el turno')
    expect(result.current.successMessage).toBeNull()
  })

  it('reset clears error and successMessage', async () => {
    mockCreateShift.mockRejectedValue(new Error('error'))

    const { result } = renderHook(() => useRequestShift())

    await act(async () => {
      await result.current.requestAppointment('spec-1')
    })

    expect(result.current.error).toBe('error')

    act(() => { result.current.reset() })

    expect(result.current.error).toBeNull()
    expect(result.current.successMessage).toBeNull()
  })
})
