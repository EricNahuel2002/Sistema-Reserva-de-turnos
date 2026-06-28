import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { getSpecialties } from '../../services/profile.service'
import { getClientShifts } from '../../services/shift.service'
import { useRequestShift } from '../../hooks/useRequestShift'
import { Dashboard } from '../../views/Dashboard'
import type { Profile, Specialty, ShiftWithDetails } from '../../types'

vi.mock('../../hooks/useAuth')
vi.mock('../../services/profile.service')
vi.mock('../../services/shift.service')
vi.mock('../../hooks/useRequestShift')

vi.mock('../../components/SpecialtyModal', () => ({
  SpecialtyModal: function MockSpecialtyModal({
    specialty,
    onClose,
    onRequestAppointment,
    isSubmitting,
    submitError,
    successMessage,
  }: {
    specialty: Specialty | null
    onClose: () => void
    onRequestAppointment?: () => void
    isSubmitting?: boolean
    submitError?: string | null
    successMessage?: string | null
  }) {
    if (!specialty) return null
    return (
      <div data-testid="specialty-modal">
        <span data-testid="modal-specialty-name">{specialty.name}</span>
        <button
          data-testid="modal-request-btn"
          onClick={onRequestAppointment}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Solicitando...' : 'Pedir turno'}
        </button>
        <button data-testid="modal-close-btn" onClick={onClose}>
          Cerrar
        </button>
        {submitError && <span data-testid="modal-error">{submitError}</span>}
        {successMessage && <span data-testid="modal-success">{successMessage}</span>}
      </div>
    )
  },
}))

vi.mock('../../components/ClientAgenda', () => ({
  ClientAgenda: function MockClientAgenda({
    shifts,
    loading,
  }: {
    shifts?: ShiftWithDetails[]
    loading?: boolean
  }) {
    return (
      <div
        data-testid="client-agenda"
        data-shifts-count={shifts?.length ?? 0}
        data-loading={loading ? 'true' : 'false'}
      />
    )
  },
}))

const mockProfile: Profile = {
  id: 'user-1',
  role_id: 'role-1',
  role: { name: 'client' },
  full_name: 'Juan Pérez',
  dni: '12345678',
  phone: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const mockSpecialty: Specialty = {
  id: 'spec-1',
  name: 'Cardiología',
  description: 'Atención cardiológica',
  active: true,
  available_from: 8,
  available_until: 17,
  available_day: 'lunes',
  image: null,
  value: 5000,
  created_at: '2026-01-01T00:00:00Z',
}

const mockShift: ShiftWithDetails = {
  id: 'shift-1',
  client_id: 'user-1',
  specialty_id: 'spec-1',
  admin_id: null,
  status: 'approved',
  assigned_date: '2026-07-15',
  assigned_time: '10:00',
  admin_notes: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  client: { id: 'user-1', full_name: 'Juan Pérez', dni: '12345678' },
  specialty: { name: 'Cardiología', available_from: 8, available_until: 17, available_day: 'lunes' },
}

function renderDashboard() {
  return render(
    <BrowserRouter>
      <Dashboard />
    </BrowserRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()

  vi.mocked(useAuth).mockReturnValue({
    user: { id: 'user-1' } as never,
    session: {} as never,
    profile: mockProfile,
    loading: false,
    signIn: vi.fn(),
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
  })

  vi.mocked(useRequestShift).mockReturnValue({
    submitting: false,
    error: null,
    successMessage: null,
    requestAppointment: vi.fn(),
    reset: vi.fn(),
  })
})

describe('Dashboard', () => {
  it('shows skeleton while loading specialties', async () => {
    vi.mocked(getSpecialties).mockReturnValue(new Promise(() => {}))
    vi.mocked(getClientShifts).mockReturnValue(new Promise(() => {}))

    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('Especialidades')).toBeInTheDocument()
    })
    expect(screen.queryByText('No hay especialidades disponibles')).not.toBeInTheDocument()
  })

  it('greets the user and shows upcoming shift count', async () => {
    vi.mocked(getSpecialties).mockResolvedValue([])
    vi.mocked(getClientShifts).mockResolvedValue([mockShift, { ...mockShift, id: 'shift-2' }])

    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('Hola, Juan')).toBeInTheDocument()
    })
    expect(screen.getByText('Tenés 2 turnos próximos')).toBeInTheDocument()
  })

  it('shows message when there are no shifts', async () => {
    vi.mocked(getSpecialties).mockResolvedValue([])
    vi.mocked(getClientShifts).mockResolvedValue([])

    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('No tenés turnos asignados todavía')).toBeInTheDocument()
    })
  })

  it('shows empty state when no specialties available', async () => {
    vi.mocked(getSpecialties).mockResolvedValue([])
    vi.mocked(getClientShifts).mockResolvedValue([])

    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('No hay especialidades disponibles')).toBeInTheDocument()
    })
  })

  it('displays loaded specialties with name and price', async () => {
    vi.mocked(getSpecialties).mockResolvedValue([mockSpecialty])
    vi.mocked(getClientShifts).mockResolvedValue([])

    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('Cardiología')).toBeInTheDocument()
    })
    expect(screen.getByText('$5.000')).toBeInTheDocument()
  })

  it('opens specialty modal on specialty card click', async () => {
    vi.mocked(getSpecialties).mockResolvedValue([mockSpecialty])
    vi.mocked(getClientShifts).mockResolvedValue([])

    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('Cardiología')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('Cardiología'))

    expect(screen.getByTestId('specialty-modal')).toBeInTheDocument()
    expect(screen.getByTestId('modal-specialty-name')).toHaveTextContent('Cardiología')
  })

  it('calls requestAppointment when Pedir turno is clicked', async () => {
    const mockRequestAppointment = vi.fn()

    vi.mocked(useRequestShift).mockReturnValue({
      submitting: false,
      error: null,
      successMessage: null,
      requestAppointment: mockRequestAppointment,
      reset: vi.fn(),
    })

    vi.mocked(getSpecialties).mockResolvedValue([mockSpecialty])
    vi.mocked(getClientShifts).mockResolvedValue([])

    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('Cardiología')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('Cardiología'))
    fireEvent.click(screen.getByTestId('modal-request-btn'))

    expect(mockRequestAppointment).toHaveBeenCalledWith('spec-1')
  })
})
