import { useEffect, useState } from 'react'
import { getSpecialties } from '../services/profile.service'
import { SpecialtyModal } from '../components/SpecialtyModal'
import type { Specialty } from '../types'

function formatHour(h: number | null): string | null {
  if (h === null || h === undefined) return null
  return `${String(h).padStart(2, '0')}:00`
}

export function Dashboard() {
  const [specialties, setSpecialties] = useState<Specialty[]>([])
  const [selectedSpecialty, setSelectedSpecialty] = useState<Specialty | null>(null)

  useEffect(() => {
    getSpecialties().then(setSpecialties)
  }, [])

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">


      <h2 className="mt-8 mb-4 text-xl font-semibold text-gray-900">Especialidades</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {specialties.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelectedSpecialty(s)}
            className="overflow-hidden rounded-xl bg-white text-left shadow-sm transition hover:shadow-md"
          >
            {s.image && (
              <img
                src={s.image}
                alt={s.name}
                className="h-40 w-full object-cover"
              />
            )}
            <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900">{s.name}</h3>
            <p className="mt-1 text-sm text-gray-500 line-clamp-2">
              {s.description ?? 'Sin descripción'}
            </p>
            {(s.available_day || s.available_from || s.available_until) && (
              <p className="mt-2 text-xs text-gray-400">
                {s.available_day && <>{s.available_day} · </>}
                {formatHour(s.available_from)} - {formatHour(s.available_until)}
              </p>
            )}
            {s.value != null && (
              <p className="mt-1 text-sm font-semibold text-green-600">${s.value.toLocaleString('es-AR')}</p>
            )}
            </div>
          </button>
        ))}
      </div>

      <SpecialtyModal
        specialty={selectedSpecialty}
        onClose={() => setSelectedSpecialty(null)}
      />
    </div>
  )
}
