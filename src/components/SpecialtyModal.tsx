function formatHour(h: number | null): string | null {
  if (h === null || h === undefined) return null
  return `${String(h).padStart(2, '0')}:00`
}

import type { Specialty } from '../types'

type Props = {
  specialty: Specialty | null
  onClose: () => void
  onRequestAppointment?: () => void
}

export function SpecialtyModal({ specialty, onClose, onRequestAppointment }: Props) {
  if (!specialty) return null

  const from = formatHour(specialty.available_from)
  const until = formatHour(specialty.available_until)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {specialty.image && (
          <img
            src={specialty.image}
            alt={specialty.name}
            className="h-48 w-full rounded-lg object-cover"
          />
        )}
        <div className="mt-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">{specialty.name}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="mt-4 text-gray-600">
          {specialty.description ?? 'Sin descripción disponible.'}
        </p>
        {(specialty.available_day || from || until) && (
          <div className="mt-4 space-y-1 text-sm text-gray-500">
            {specialty.available_day && <p>📅 Día: {specialty.available_day}</p>}
            {(from || until) && (
              <p>🕒 Horario: {from ?? '—'} - {until ?? '—'}</p>
            )}
          </div>
        )}
        {specialty.value != null && (
          <p className="mt-3 text-lg font-bold text-green-600">${specialty.value.toLocaleString('es-AR')}</p>
        )}
        <button
          onClick={onRequestAppointment}
          className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          Pedir turno
        </button>
      </div>
    </div>
  )
}
