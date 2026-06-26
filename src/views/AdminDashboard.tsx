import { useEffect, useState } from 'react'
import { getAllShifts } from '../services/shift.service'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import type { ShiftWithDetails } from '../types'

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

export function AdminDashboard() {
  const [shifts, setShifts] = useState<ShiftWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getAllShifts()
      .then(setShifts)
      .catch((err) => setError(err instanceof Error ? err.message : 'Error al cargar los turnos'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner />

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h2 className="mb-6 text-xl font-semibold text-gray-900">Panel de Administración</h2>

      {error && (
        <p className="mb-4 text-sm text-red-600">{error}</p>
      )}

      {shifts.length === 0 && !error && (
        <p className="text-sm text-gray-500">No hay turnos registrados</p>
      )}

      {shifts.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Paciente</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">DNI</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Especialidad</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Estado</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Creado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {shifts.map((shift) => (
                <tr key={shift.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900">
                    {shift.client?.full_name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {shift.client?.dni ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {shift.specialty?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[shift.status]}`}>
                      {statusLabels[shift.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(shift.created_at).toLocaleDateString('es-AR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
