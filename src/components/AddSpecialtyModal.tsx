import { useState } from 'react'
import { X, AlertCircle, Loader2, ChevronRight } from 'lucide-react'
import { createSpecialty } from '../services/profile.service'

interface AddSpecialtyModalProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

export function AddSpecialtyModal({ open, onClose, onCreated }: AddSpecialtyModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [value, setValue] = useState('')
  const [availableDay, setAvailableDay] = useState('')
  const [availableFrom, setAvailableFrom] = useState('')
  const [availableUntil, setAvailableUntil] = useState('')
  const [active, setActive] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('El nombre es obligatorio')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await createSpecialty({
        name: name.trim(),
        description: description.trim() || null,
        value: value ? Number(value) : null,
        available_day: availableDay.trim() || null,
        available_from: availableFrom ? Number(availableFrom) : null,
        available_until: availableUntil ? Number(availableUntil) : null,
        image: null,
        active,
      })
      onCreated()
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear especialidad')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setName('')
    setDescription('')
    setValue('')
    setAvailableDay('')
    setAvailableFrom('')
    setAvailableUntil('')
    setActive(true)
    setError(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Agregar especialidad</h3>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Nombre *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Ej: Medicina General"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Descripción</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Descripción de la especialidad"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Precio ($)</label>
              <input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                min={0}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Ej: 3000"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Días disponibles</label>
              <div className="relative">
                <select
                  value={availableDay}
                  onChange={(e) => setAvailableDay(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-gray-300 px-3 py-2 pr-10 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Seleccionar...</option>
                  <option value="Lun - Vie">Lun - Vie</option>
                  <option value="Lun - Sáb">Lun - Sáb</option>
                  <option value="Lun - Mié">Lun - Mié</option>
                  <option value="Mar - Jue">Mar - Jue</option>
                  <option value="Mar - Sáb">Mar - Sáb</option>
                  <option value="Jue - Vie">Jue - Vie</option>
                  <option value="Sáb - Dom">Sáb - Dom</option>
                  <option value="Lunes">Lunes</option>
                  <option value="Martes">Martes</option>
                  <option value="Miércoles">Miércoles</option>
                  <option value="Jueves">Jueves</option>
                  <option value="Viernes">Viernes</option>
                  <option value="Sábado">Sábado</option>
                </select>
                <ChevronRight className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-gray-400" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Desde (hora)</label>
              <input
                type="number"
                value={availableFrom}
                onChange={(e) => setAvailableFrom(e.target.value)}
                min={0}
                max={23}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Ej: 8"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Hasta (hora)</label>
              <input
                type="number"
                value={availableUntil}
                onChange={(e) => setAvailableUntil(e.target.value)}
                min={0}
                max={23}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Ej: 17"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="active"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="active" className="text-sm font-medium text-gray-700">Activo</label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
