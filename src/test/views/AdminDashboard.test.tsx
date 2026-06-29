import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import {
  getAllShifts,
  getPendingShiftsCount,
  getCancelledShiftsCount,
  getApprovedShiftsCount,
} from '../../services/shift.service'
import { getSpecialtiesCount } from '../../services/profile.service'
import { AdminDashboard } from '../../views/AdminDashboard'
import type { ShiftWithDetails } from '../../types'

vi.mock('../../services/shift.service')
vi.mock('../../services/profile.service')

vi.mock('../../components/AssignShiftModal', () => ({
  AssignShiftModal: function MockAssignShiftModal({
    shift,
    open,
    onClose,
    onAssigned,
  }: {
    shift: ShiftWithDetails | null
    open: boolean
    onClose: () => void
    onAssigned: () => void
  }) {
    if (!open || !shift) return null
    return (
      <div data-testid="assign-shift-modal">
        <span data-testid="modal-shift-id">{shift.id}</span>
        <span data-testid="modal-shift-name">{shift.client?.full_name}</span>
        <button data-testid="modal-assigned-btn" onClick={onAssigned}>
          Asignado
        </button>
        <button data-testid="modal-close-btn" onClick={onClose}>
          Cerrar
        </button>
      </div>
    )
  },
}))

vi.mock('lucide-react', () => ({
  Calendar: () => 'Calendar-icon',
  Wrench: () => 'Wrench-icon',
  X: () => 'X-icon',
  Search: () => 'Search-icon',
  Menu: () => 'Menu-icon',
  Clock: () => 'Clock-icon',
  XCircle: () => 'XCircle-icon',
  CheckCircle: () => 'CheckCircle-icon',
  ChevronRight: () => 'ChevronRight-icon',
  AlertCircle: () => 'AlertCircle-icon',
  Filter: () => 'Filter-icon',
  Loader2: () => 'Loader2-icon',
}))

const baseShift = {
  client_id: '',
  specialty_id: '',
  admin_id: null as string | null,
  admin_notes: null as string | null,
  created_at: '',
  updated_at: '',
}

const mockShifts: ShiftWithDetails[] = [
  {
    ...baseShift,
    id: 'shift-1',
    client_id: 'client-1',
    specialty_id: 'spec-1',
    status: 'pending',
    assigned_date: null,
    assigned_time: null,
    created_at: '2026-06-01T10:00:00Z',
    updated_at: '2026-06-01T10:00:00Z',
    client: { id: 'client-1', full_name: 'Juan Pérez', dni: '12345678' },
    specialty: { name: 'Cardiología', available_from: 8, available_until: 17, available_day: 'lunes' },
  },
  {
    ...baseShift,
    id: 'shift-2',
    client_id: 'client-2',
    specialty_id: 'spec-2',
    status: 'approved',
    assigned_date: '2026-07-15',
    assigned_time: '10:00',
    created_at: '2026-06-10T10:00:00Z',
    updated_at: '2026-06-10T10:00:00Z',
    client: { id: 'client-2', full_name: 'María García', dni: '87654321' },
    specialty: { name: 'Odontología', available_from: 9, available_until: 15, available_day: 'martes' },
  },
  {
    ...baseShift,
    id: 'shift-3',
    client_id: 'client-3',
    specialty_id: 'spec-3',
    status: 'cancelled',
    assigned_date: null,
    assigned_time: null,
    created_at: '2026-05-20T10:00:00Z',
    updated_at: '2026-05-20T10:00:00Z',
    client: null,
    specialty: null,
  },
]

function renderDashboard() {
  return render(<AdminDashboard />)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getAllShifts).mockResolvedValue(mockShifts)
  vi.mocked(getPendingShiftsCount).mockResolvedValue(5)
  vi.mocked(getCancelledShiftsCount).mockResolvedValue(3)
  vi.mocked(getApprovedShiftsCount).mockResolvedValue(10)
  vi.mocked(getSpecialtiesCount).mockResolvedValue(6)
})

describe('AdminDashboard - ShiftsManagement', () => {
  it('shows loading spinner while fetching shifts', async () => {
    vi.mocked(getAllShifts).mockReturnValue(new Promise(() => {}))

    renderDashboard()

    expect(screen.getByText('Loader2-icon')).toBeInTheDocument()
    expect(screen.queryByText('Gestión de Turnos')).not.toBeInTheDocument()
  })

  it('renders stats cards and shift table after loading', async () => {
    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('Gestión de Turnos')).toBeInTheDocument()
    })

    expect(screen.getByText('Turnos Pendientes')).toBeInTheDocument()
    expect(screen.getByText('Turnos Cancelados')).toBeInTheDocument()
    expect(screen.getByText('Turnos Aprobados')).toBeInTheDocument()
    expect(screen.getByText('Especialidades')).toBeInTheDocument()

    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('6')).toBeInTheDocument()

    expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
    expect(screen.getByText('María García')).toBeInTheDocument()
  })

  it('displays error banner when getAllShifts fails', async () => {
    vi.mocked(getAllShifts).mockRejectedValue(new Error('Error de red'))

    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText(/Error de red/)).toBeInTheDocument()
    })
  })

  it('dismisses error banner on close', async () => {
    vi.mocked(getAllShifts).mockRejectedValue(new Error('Error de red'))

    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText(/Error de red/)).toBeInTheDocument()
    })

    const buttons = screen.getAllByRole('button', { name: /X-icon/i })
    fireEvent.click(buttons[1]!)

    expect(screen.queryByText(/Error de red/)).not.toBeInTheDocument()
  })

  it('shows empty state when no shifts exist', async () => {
    vi.mocked(getAllShifts).mockResolvedValue([])

    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('No hay turnos registrados')).toBeInTheDocument()
    })
  })

  it('shows no-results message when filter yields no matches', async () => {
    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('Gestión de Turnos')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByPlaceholderText('Buscar paciente o DNI...'), {
      target: { value: 'ZZZ' },
    })

    await waitFor(() => {
      expect(
        screen.getByText('No se encontraron turnos con los filtros aplicados'),
      ).toBeInTheDocument()
    })
  })

  it('filters shifts by patient name', async () => {
    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
    })

    expect(screen.getByText('María García')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('Buscar paciente o DNI...'), {
      target: { value: 'Juan' },
    })

    await waitFor(() => {
      expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
    })
    expect(screen.queryByText('María García')).not.toBeInTheDocument()
  })

  it('filters shifts by DNI', async () => {
    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('12345678')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByPlaceholderText('Buscar paciente o DNI...'), {
      target: { value: '8765' },
    })

    await waitFor(() => {
      expect(screen.getByText('87654321')).toBeInTheDocument()
    })
    expect(screen.queryByText('12345678')).not.toBeInTheDocument()
  })

  it('filters shifts by status', async () => {
    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('Gestión de Turnos')).toBeInTheDocument()
    })

    const table = screen.getByRole('table')
    expect(within(table).getByText('Pendiente')).toBeInTheDocument()
    expect(within(table).getByText('Aprobado')).toBeInTheDocument()
    expect(within(table).getByText('Cancelado')).toBeInTheDocument()

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'pending' },
    })

    await waitFor(() => {
      expect(within(table).getByText('Pendiente')).toBeInTheDocument()
    })
    expect(within(table).queryByText('Aprobado')).not.toBeInTheDocument()
    expect(within(table).queryByText('Cancelado')).not.toBeInTheDocument()
  })

  it('shows fallback for missing client and specialty data', async () => {
    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('Gestión de Turnos')).toBeInTheDocument()
    })

    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThanOrEqual(1)
  })

  it('shows correct status label per status', async () => {
    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('Gestión de Turnos')).toBeInTheDocument()
    })

    const table = screen.getByRole('table')
    expect(within(table).getByText('Pendiente')).toBeInTheDocument()
    expect(within(table).getByText('Aprobado')).toBeInTheDocument()
    expect(within(table).getByText('Cancelado')).toBeInTheDocument()
  })

  it('opens AssignShiftModal when clicking Gestionar', async () => {
    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('Gestión de Turnos')).toBeInTheDocument()
    })

    expect(screen.queryByTestId('assign-shift-modal')).not.toBeInTheDocument()

    const manageButtons = screen.getAllByText('Gestionar')
    fireEvent.click(manageButtons[0]!)

    await waitFor(() => {
      expect(screen.getByTestId('assign-shift-modal')).toBeInTheDocument()
    })
    expect(screen.getByTestId('modal-shift-id')).toHaveTextContent('shift-1')
    expect(screen.getByTestId('modal-shift-name')).toHaveTextContent('Juan Pérez')
  })

  it('reloads shifts when modal triggers onAssigned', async () => {
    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('Gestión de Turnos')).toBeInTheDocument()
    })

    expect(vi.mocked(getAllShifts)).toHaveBeenCalledTimes(1)

    const manageButtons = screen.getAllByText('Gestionar')
    fireEvent.click(manageButtons[0]!)

    await waitFor(() => {
      expect(screen.getByTestId('assign-shift-modal')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('modal-assigned-btn'))

    await waitFor(() => {
      expect(vi.mocked(getAllShifts)).toHaveBeenCalledTimes(2)
    })
  })
})
