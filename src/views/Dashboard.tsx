import { useEffect, useState } from 'react'
import { getSpecialties } from '../services/profile.service'
import { getClientShifts } from '../services/shift.service'
import { useRequestShift } from '../hooks/useRequestShift'
import { SpecialtyModal } from '../components/SpecialtyModal'
import { ClientAgenda } from '../components/ClientAgenda'
import { formatHour } from '../lib/utils'
import { Stethoscope, Menu, X, Calendar } from 'lucide-react'
import type { Specialty, ShiftWithDetails } from '../types'

function SpecialtyCardSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-xl bg-white shadow-sm">
      <div className="h-40 w-full bg-gray-200" />
      <div className="space-y-3 p-6">
        <div className="h-5 w-3/4 rounded bg-gray-200" />
        <div className="h-4 w-full rounded bg-gray-100" />
        <div className="h-4 w-1/2 rounded bg-gray-100" />
      </div>
    </div>
  )
}

export function Dashboard() {
  const [specialties, setSpecialties] = useState<Specialty[]>([])
  const [specialtiesLoading, setSpecialtiesLoading] = useState(true)
  const [shifts, setShifts] = useState<ShiftWithDetails[]>([])
  const [shiftsLoading, setShiftsLoading] = useState(true)
  const [selectedSpecialty, setSelectedSpecialty] = useState<Specialty | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { submitting, error, successMessage, requestAppointment, reset } = useRequestShift()

  useEffect(() => {
    getSpecialties()
      .then(setSpecialties)
      .finally(() => setSpecialtiesLoading(false))
    getClientShifts()
      .then(setShifts)
      .catch(() => {})
      .finally(() => setShiftsLoading(false))
  }, [])

  function handleCloseModal() {
    setSelectedSpecialty(null)
    reset()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile header */}
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 lg:hidden">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="rounded-lg p-1.5 text-gray-600 hover:bg-gray-100"
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <h1 className="text-base font-semibold text-gray-900">Mi Panel</h1>
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
        className={`fixed inset-y-0 left-0 z-30 w-96 transform border-r border-gray-200 bg-white transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center border-b border-gray-200 px-6">
          <Calendar className="mr-2 h-6 w-6 text-blue-600" />
          <span className="text-lg font-bold text-gray-900">Mi Panel</span>
        </div>

        <div className="overflow-y-auto p-4" style={{ height: 'calc(100% - 4rem)' }}>
          <ClientAgenda shifts={shifts} loading={shiftsLoading} compact />
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:ml-96">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="mb-8 rounded-xl bg-white p-6 text-center shadow-sm">
            <h1 className="text-lg font-semibold text-gray-900">
              ¿Necesitás un turno? Elegí una especialidad y solicitá el turno que quieras.
            </h1>
          </div>

          <div className="mt-6">
            <div className="mb-4 flex items-center gap-2">
              <div className="h-1 w-8 rounded-full bg-blue-500" />
              <h2 className="text-xl font-semibold text-gray-900">Especialidades</h2>
            </div>

            {specialtiesLoading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <SpecialtyCardSkeleton key={i} />
                ))}
              </div>
            ) : specialties.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-xl bg-white p-12 text-center shadow-sm">
                <Stethoscope className="h-12 w-12 text-gray-300" />
                <p className="text-sm text-gray-500">No hay especialidades disponibles</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {specialties.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSpecialty(s)}
                    className="group overflow-hidden rounded-xl bg-white text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:ring-2 hover:ring-blue-300 cursor-pointer"
                  >
                    {s.image ? (
                      <img src={s.image} alt={s.name} className="h-40 w-full object-cover" />
                    ) : (
                      <div className="flex h-40 w-full items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
                        <Stethoscope className="h-12 w-12 text-blue-300 transition-transform group-hover:scale-110" />
                      </div>
                    )}
                    <div className="p-6">
                      <h3 className="text-lg font-semibold text-gray-900">{s.name}</h3>
                      <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                        {s.description ?? 'Sin descripción'}
                      </p>
                      {(s.available_day || s.available_from || s.available_until) && (
                        <p className="mt-2 text-xs text-gray-400">
                          {s.available_day && <>{s.available_day}</>}
                          {(s.available_from || s.available_until) && (
                            <>
                              {s.available_day ? ' · ' : ''}
                              {formatHour(s.available_from)} - {formatHour(s.available_until)}
                            </>
                          )}
                        </p>
                      )}
                      {s.value != null && (
                        <p className="mt-1 text-sm font-semibold text-green-600">${s.value.toLocaleString('es-AR')}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <SpecialtyModal
            specialty={selectedSpecialty}
            onClose={handleCloseModal}
            onRequestAppointment={() => selectedSpecialty && requestAppointment(selectedSpecialty.id)}
            isSubmitting={submitting}
            submitError={error}
            successMessage={successMessage}
          />
        </div>
      </main>
    </div>
  )
}
