import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AssignShiftModal } from '../../components/AssignShiftModal'
import { assignShift, cancelShift, getShiftsByDateRange } from '../../services/shift.service'
import type { ShiftWithDetails } from '../../types'

vi.mock('../../services/shift.service')
vi.mock('lucide-react', () => ({
  X: () => 'X-icon',
  ChevronLeft: () => 'ChevronLeft-icon',
  ChevronRight: () => 'ChevronRight-icon',
  AlertCircle: () => 'AlertCircle-icon',
  XCircle: () => 'XCircle-icon',
  Loader2: () => 'Loader2-icon',
}))

const baseShift = {
  id: 'shift-1',
  client_id: 'client-1',
  specialty_id: 'spec-1',
  admin_id: null,
  admin_notes: null,
  created_at: '2026-07-01T00:00:00Z',
  updated_at: '2026-07-01T00:00:00Z',
}

const baseClient = { id: 'client-1', full_name: 'Juan Pérez', dni: '12345678' }
const baseSpecialty = { name: 'Cardiología', available_from: 9, available_until: 13, available_day: 'miércoles' }

const pendingShift: ShiftWithDetails = {
  ...baseShift,
  status: 'pending',
  assigned_date: null,
  assigned_time: null,
  client: baseClient,
  specialty: baseSpecialty,
}

const approvedShift: ShiftWithDetails = {
  ...baseShift,
  status: 'approved',
  assigned_date: '2026-07-15',
  assigned_time: '10:00',
  client: baseClient,
  specialty: baseSpecialty,
}

const cancelledShift: ShiftWithDetails = {
  ...baseShift,
  status: 'cancelled',
  assigned_date: null,
  assigned_time: null,
  client: baseClient,
  specialty: baseSpecialty,
}

function renderModal(shift: ShiftWithDetails | null, open = true) {
  return render(
    <BrowserRouter>
      <AssignShiftModal
        shift={shift}
        open={open}
        onClose={vi.fn()}
        onAssigned={vi.fn()}
      />
    </BrowserRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-07-15'))
  vi.mocked(getShiftsByDateRange).mockResolvedValue([])
  vi.mocked(assignShift).mockResolvedValue({ success: true })
})

afterEach(() => {
  vi.useRealTimers()
})

async function settle() {
  await act(async () => {
    vi.advanceTimersByTime(5000)
  })
}

describe('AssignShiftModal', () => {
  it('renders nothing when not open', () => {
    const { container } = renderModal(pendingShift, false)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when no shift is provided', () => {
    const { container } = renderModal(null)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows a message when the shift is already approved', async () => {
    renderModal(approvedShift)
    await settle()
    expect(screen.getByText(/ya fue aprobado/)).toBeInTheDocument()
  })

  it('shows cancel button for approved shifts', async () => {
    renderModal(approvedShift)
    await settle()
    expect(screen.getByRole('button', { name: /cancelar turno/i })).toBeInTheDocument()
  })

  it('opens confirmation modal when cancel is clicked', async () => {
    renderModal(approvedShift)
    await settle()

    fireEvent.click(screen.getByRole('button', { name: /cancelar turno/i }))

    expect(screen.getByText('¿Estás seguro de que querés cancelar este turno?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sí, cancelar turno/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /volver/i })).toBeInTheDocument()
  })

  it('calls cancelShift and closes both modals after success', async () => {
    vi.mocked(cancelShift).mockResolvedValue({ success: true })
    const onClose = vi.fn()
    const onAssigned = vi.fn()

    render(
      <BrowserRouter>
        <AssignShiftModal
          shift={approvedShift}
          open={true}
          onClose={onClose}
          onAssigned={onAssigned}
        />
      </BrowserRouter>,
    )
    await settle()

    fireEvent.click(screen.getByRole('button', { name: /cancelar turno/i }))
    fireEvent.click(screen.getByRole('button', { name: /sí, cancelar turno/i }))
    await settle()

    expect(cancelShift).toHaveBeenCalledWith('shift-1')
    expect(onAssigned).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('shows loading spinner while cancelling', async () => {
    let resolveCancel: (value: unknown) => void
    vi.mocked(cancelShift).mockReturnValue(new Promise((r) => { resolveCancel = r }) as never)
    const onClose = vi.fn()
    const onAssigned = vi.fn()

    render(
      <BrowserRouter>
        <AssignShiftModal
          shift={approvedShift}
          open={true}
          onClose={onClose}
          onAssigned={onAssigned}
        />
      </BrowserRouter>,
    )
    await settle()

    fireEvent.click(screen.getByRole('button', { name: /cancelar turno/i }))
    fireEvent.click(screen.getByRole('button', { name: /sí, cancelar turno/i }))

    expect(screen.getByText('Cancelando turno...')).toBeInTheDocument()
    resolveCancel!(undefined)
    await settle()
  })

  it('shows a message when the shift is cancelled', async () => {
    renderModal(cancelledShift)
    await settle()
    expect(screen.getByText(/fue cancelado/)).toBeInTheDocument()
  })

  it('shows patient details and calendar for pending shifts', async () => {
    renderModal(pendingShift)
    await settle()

    expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
    expect(screen.getByText('12345678')).toBeInTheDocument()
    expect(screen.getByText('Cardiología')).toBeInTheDocument()
    expect(screen.getByText('Julio 2026')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /asignar horario/i })).toBeDisabled()
  })

  it('disables past calendar days', async () => {
    renderModal(pendingShift)
    await settle()

    const day8 = screen.getByText('8').closest('button')
    expect(day8).toBeDisabled()
  })

  it('shows time slots when a future day is selected', async () => {
    renderModal(pendingShift)
    await settle()

    fireEvent.click(screen.getByText('22'))

    expect(screen.getByText(/Horarios disponibles/)).toBeInTheDocument()
    expect(screen.getByText('09:00')).toBeInTheDocument()
    expect(screen.getByText('12:30')).toBeInTheDocument()
    expect(screen.queryByText('13:00')).not.toBeInTheDocument()
  })

  it('enables submit button after selecting date and time', async () => {
    renderModal(pendingShift)
    await settle()

    fireEvent.click(screen.getByText('22'))
    expect(screen.getByRole('button', { name: /asignar horario/i })).toBeDisabled()

    fireEvent.click(screen.getByText('09:00'))
    expect(screen.getByRole('button', { name: /asignar horario/i })).toBeEnabled()
  })

  it('disables time slots occupied by other shifts', async () => {
    const occupiedShift: ShiftWithDetails = {
      ...baseShift,
      id: 'shift-2',
      status: 'approved',
      assigned_date: '2026-07-22',
      assigned_time: '10:00',
      client: { id: 'client-2', full_name: 'María García', dni: '87654321' },
      specialty: baseSpecialty,
    }
    vi.mocked(getShiftsByDateRange).mockResolvedValue([occupiedShift])
    renderModal(pendingShift)
    await settle()

    fireEvent.click(screen.getByText('22'))
    const slot10 = screen.getByText('10:00').closest('button')
    expect(slot10).toBeDisabled()
    expect(screen.getByText('María García')).toBeInTheDocument()
  })

  it('does not disable the time slot that belongs to the current shift', async () => {
    const shiftWithOwnSlot: ShiftWithDetails = {
      ...pendingShift,
      assigned_date: '2026-07-22',
      assigned_time: '10:00',
    }
    const sameSlotOccupied: ShiftWithDetails = {
      ...baseShift,
      id: 'shift-1',
      status: 'approved',
      assigned_date: '2026-07-22',
      assigned_time: '10:00',
      client: baseClient,
      specialty: baseSpecialty,
    }
    vi.mocked(getShiftsByDateRange).mockResolvedValue([sameSlotOccupied])
    renderModal(shiftWithOwnSlot)
    await settle()

    const slot10 = screen.getByText('10:00').closest('button')
    expect(slot10).toBeEnabled()
  })

  it('calls assignShift and triggers callbacks on success', async () => {
    const onClose = vi.fn()
    const onAssigned = vi.fn()

    render(
      <BrowserRouter>
        <AssignShiftModal
          shift={pendingShift}
          open={true}
          onClose={onClose}
          onAssigned={onAssigned}
        />
      </BrowserRouter>,
    )
    await settle()

    fireEvent.click(screen.getByText('22'))
    fireEvent.click(screen.getByText('09:00'))
    fireEvent.click(screen.getByRole('button', { name: /asignar horario/i }))

    await settle()

    expect(assignShift).toHaveBeenCalledWith('shift-1', '2026-07-22', '09:00')
    expect(onAssigned).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('shows error when assignShift fails', async () => {
    vi.mocked(assignShift).mockRejectedValue(new Error('Error de red'))

    const onClose = vi.fn()
    const onAssigned = vi.fn()

    render(
      <BrowserRouter>
        <AssignShiftModal
          shift={pendingShift}
          open={true}
          onClose={onClose}
          onAssigned={onAssigned}
        />
      </BrowserRouter>,
    )
    await settle()

    fireEvent.click(screen.getByText('22'))
    fireEvent.click(screen.getByText('09:00'))
    fireEvent.click(screen.getByRole('button', { name: /asignar horario/i }))

    await settle()

    expect(screen.getByText(/Error de red/)).toBeInTheDocument()
    expect(onAssigned).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })
})
