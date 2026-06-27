import { useEffect, useState } from 'react'
import { getAllShifts, getPendingShiftsCount, getTodayShiftsCount } from '../services/shift.service'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { AssignShiftModal } from '../components/AssignShiftModal'
import type { ShiftWithDetails, ShiftStatus } from '../types'
import {
  LayoutDashboard,
  Calendar,
  Wrench,
  Users,
  X,
  Search,
  Menu,
  X as XIcon,
  Clock,
  CalendarDays,
  Pencil,
  Trash2,
  ChevronRight,
  AlertCircle,
  Filter,
  Plus,
} from 'lucide-react'

type Section = 'dashboard' | 'shifts' | 'specialties'

const navItems: { id: Section; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Resumen', icon: LayoutDashboard },
  { id: 'shifts', label: 'Turnos', icon: Calendar },
  { id: 'specialties', label: 'Especialidades', icon: Wrench },
]

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  cancelled: 'Cancelado',
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

const mockSpecialties = [
  { id: '1', name: 'Medicina General', description: 'Consultas de atención primaria y chequeos generales', value: 3000, active: true, available_day: 'Lun - Vie', available_from: 8, available_until: 17 },
  { id: '2', name: 'Odontología', description: 'Cuidado dental y limpiezas', value: 5000, active: true, available_day: 'Mar - Jue', available_from: 9, available_until: 15 },
  { id: '3', name: 'Pediatría', description: 'Atención médica para niños', value: 3500, active: true, available_day: 'Lun - Mié', available_from: 8, available_until: 14 },
  { id: '4', name: 'Dermatología', description: 'Tratamientos de la piel', value: 4500, active: false, available_day: 'Jue - Vie', available_from: 10, available_until: 16 },
  { id: '5', name: 'Psicología', description: 'Terapia y orientación psicológica', value: 4000, active: true, available_day: 'Lun - Vie', available_from: 9, available_until: 18 },
  { id: '6', name: 'Nutrición', description: 'Planes alimentarios y seguimiento', value: 2500, active: true, available_day: 'Mar - Sáb', available_from: 8, available_until: 13 },
]

export function AdminDashboard() {
  const [activeSection, setActiveSection] = useState<Section>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile header */}
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 lg:hidden">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="rounded-lg p-1.5 text-gray-600 hover:bg-gray-100"
        >
          {sidebarOpen ? <XIcon className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <h1 className="text-base font-semibold text-gray-900">Panel Admin</h1>
      </div>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 transform border-r border-gray-200 bg-white transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center border-b border-gray-200 px-6">
          <Calendar className="mr-2 h-6 w-6 text-blue-600" />
          <span className="text-lg font-bold text-gray-900">Admin Panel</span>
        </div>

        <nav className="space-y-1 p-4">
          {navItems.map((item) => {
            const IconComponent = item.icon
            const isActive = activeSection === item.id
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveSection(item.id)
                  setSidebarOpen(false)
                }}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <IconComponent className={`h-5 w-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                {item.label}
              </button>
            )
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main className="lg:ml-64">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {activeSection === 'dashboard' && <DashboardOverview />}
          {activeSection === 'shifts' && <ShiftsManagement />}
          {activeSection === 'specialties' && <SpecialtiesManagement />}
        </div>
      </main>
    </div>
  )
}

function DashboardOverview() {
  const [pendingCount, setPendingCount] = useState<number | null>(null)
  const [pendingLoading, setPendingLoading] = useState(true)
  const [todayCount, setTodayCount] = useState<number | null>(null)
  const [todayLoading, setTodayLoading] = useState(true)

  useEffect(() => {
    getPendingShiftsCount()
      .then(setPendingCount)
      .catch(() => setPendingCount(0))
      .finally(() => setPendingLoading(false))

    getTodayShiftsCount()
      .then(setTodayCount)
      .catch(() => setTodayCount(0))
      .finally(() => setTodayLoading(false))
  }, [])

  return (
    <div>
      <h2 className="mb-6 text-2xl font-semibold text-gray-900">Resumen</h2>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Turnos Pendientes</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {pendingLoading ? '—' : pendingCount}
              </p>
            </div>
            <div className="rounded-lg bg-yellow-50 p-3">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Turnos Hoy</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {todayLoading ? '—' : todayCount}
              </p>
            </div>
            <div className="rounded-lg bg-blue-50 p-3">
              <CalendarDays className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Clientes Registrados</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">—</p>
            </div>
            <div className="rounded-lg bg-green-50 p-3">
              <Users className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Especialidades</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">—</p>
            </div>
            <div className="rounded-lg bg-purple-50 p-3">
              <Wrench className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Actividad Reciente</h3>
        <p className="text-sm text-gray-500">No hay actividad reciente para mostrar.</p>
      </div>
    </div>
  )
}

function formatISODate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

function ShiftsManagement() {
  const [shifts, setShifts] = useState<ShiftWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ShiftStatus | 'all'>('all')
  const [selectedShift, setSelectedShift] = useState<ShiftWithDetails | null>(null)
  const [showAssignModal, setShowAssignModal] = useState(false)

  const loadShifts = () => {
    setLoading(true)
    getAllShifts()
      .then(setShifts)
      .catch((err) => setError(err instanceof Error ? err.message : 'Error al cargar los turnos'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadShifts()
  }, [])

  const filteredShifts = shifts.filter((shift) => {
    const matchesSearch =
      !search ||
      (shift.client?.full_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (shift.client?.dni ?? '').includes(search)
    const matchesStatus = statusFilter === 'all' || shift.status === statusFilter
    return matchesSearch && matchesStatus
  })

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <h2 className="mb-6 text-2xl font-semibold text-gray-900">Gestión de Turnos</h2>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar paciente o DNI..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ShiftStatus | 'all')}
            className="appearance-none rounded-lg border border-gray-300 py-2 pl-10 pr-10 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">Todos los estados</option>
            <option value="pending">Pendiente</option>
            <option value="approved">Aprobado</option>
            <option value="cancelled">Cancelado</option>
          </select>
          <ChevronRight className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-gray-400" />
        </div>
      </div>

      {/* Table */}
      {filteredShifts.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <Calendar className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">
            {shifts.length === 0 ? 'No hay turnos registrados' : 'No se encontraron turnos con los filtros aplicados'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Paciente</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">DNI</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Especialidad</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Fecha</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Estado</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Creado</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredShifts.map((shift) => (
                  <tr key={shift.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">
                      {shift.client?.full_name ?? '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                      {shift.client?.dni ?? '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                      {shift.specialty?.name ?? '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                      {shift.assigned_date ? (
                        <span>
                          {formatISODate(shift.assigned_date!)}
                          {shift.assigned_time ? ` ${shift.assigned_time.slice(0, 5)}` : ''}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[shift.status]}`}>
                        {statusLabels[shift.status]}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-500">
                      {new Date(shift.created_at).toLocaleDateString('es-AR')}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-center">
                      <button
                        onClick={() => {
                          setSelectedShift(shift)
                          setShowAssignModal(true)
                        }}
                        className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                      >
                        Gestionar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AssignShiftModal
        shift={selectedShift}
        open={showAssignModal}
        onClose={() => {
          setShowAssignModal(false)
          setSelectedShift(null)
        }}
        onAssigned={loadShifts}
      />
    </div>
  )
}

function SpecialtiesManagement() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900">Especialidades</h2>
        <button className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" />
          Agregar
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-500">Nombre</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Descripción</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Precio</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Disponibilidad</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Activo</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {mockSpecialties.map((specialty) => (
                <tr key={specialty.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">{specialty.name}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-gray-600">{specialty.description}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-900">
                    ${specialty.value.toLocaleString('es-AR')}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                    {specialty.available_day} {specialty.available_from}:00 - {specialty.available_until}:00
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-center">
                    <span
                      className={`inline-block h-5 w-5 rounded-full ${specialty.active ? 'bg-green-500' : 'bg-gray-300'}`}
                    />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100" title="Editar">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button className="rounded-lg p-1.5 text-red-500 hover:bg-red-50" title="Eliminar">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}


