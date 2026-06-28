import { useEffect } from 'react'
import { X, CheckCircle, Calendar, Clock } from 'lucide-react'
import { formatHour } from '../lib/utils'
import type { Specialty } from '../types'

type Props = {
  specialty: Specialty | null
  onClose: () => void
  onRequestAppointment?: () => void
  isSubmitting?: boolean
  submitError?: string | null
  successMessage?: string | null
}

export function SpecialtyModal({
  specialty,
  onClose,
  onRequestAppointment,
  isSubmitting,
  submitError,
  successMessage,
}: Props) {
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(onClose, 2000)
      return () => clearTimeout(timer)
    }
  }, [successMessage, onClose])

  if (!specialty) return null

  const from = formatHour(specialty.available_from)
  const until = formatHour(specialty.available_until)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition-opacity"
      onClick={onClose}
    >
      <div
        className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-lg animate-[fadeIn_200ms_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        {successMessage ? (
          <div className="flex flex-col items-center py-8">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-lg font-semibold text-gray-900">{successMessage}</p>
          </div>
        ) : (
          <>
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
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-4 text-gray-600">
              {specialty.description ?? 'Sin descripción disponible.'}
            </p>
            {(specialty.available_day || from || until) && (
              <div className="mt-4 space-y-2 text-sm text-gray-500">
                {specialty.available_day && (
                  <p className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    Día: {specialty.available_day}
                  </p>
                )}
                {(from || until) && (
                  <p className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    Horario: {from ?? '—'} - {until ?? '—'}
                  </p>
                )}
              </div>
            )}
            {specialty.value != null && (
              <p className="mt-3 text-lg font-bold text-green-600">${specialty.value.toLocaleString('es-AR')}</p>
            )}
            {submitError && (
              <p className="mt-3 text-sm text-red-600">{submitError}</p>
            )}
            <button
              onClick={onRequestAppointment}
              disabled={isSubmitting}
              className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Solicitando...' : 'Pedir turno'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
