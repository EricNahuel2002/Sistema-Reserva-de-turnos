import { useState, useEffect, useMemo } from 'react'
import { getClientShifts } from '../services/shift.service'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import type { ShiftWithDetails } from '../types'

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  cancelled: 'Cancelado',
}

const statusBadgeColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

function toDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatISODate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

function getDotColor(shifts: ShiftWithDetails[]): string {
  if (shifts.some((s) => s.status === 'approved')) return 'bg-green-500'
  if (shifts.some((s) => s.status === 'pending')) return 'bg-yellow-400'
  return 'bg-blue-500'
}

function CalendarSkeleton() {
  return (
    <div className="mb-8 animate-pulse">
      <div className="mb-4 h-7 w-24 rounded bg-gray-200" />
      <div className="rounded-xl bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div className="h-5 w-32 rounded bg-gray-200" />
          <div className="h-5 w-16 rounded bg-gray-200" />
        </div>
        <div className="p-6">
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="aspect-square rounded bg-gray-100" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

type Props = {
  shifts?: ShiftWithDetails[]
  loading?: boolean
}

export function ClientAgenda({ shifts: propShifts, loading: propLoading }: Props) {
  const [internalShifts, setInternalShifts] = useState<ShiftWithDetails[]>([])
  const [internalLoading, setInternalLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const shifts = propShifts ?? internalShifts
  const loading = propLoading ?? internalLoading

  useEffect(() => {
    if (propShifts) {
      setInternalLoading(false)
      return
    }
    setInternalLoading(true)
    setError(null)
    getClientShifts()
      .then(setInternalShifts)
      .catch((err) => setError(err instanceof Error ? err.message : 'Error al cargar turnos'))
      .finally(() => setInternalLoading(false))
  }, [propShifts])

  const monthShiftsMap = useMemo(() => {
    const map = new Map<string, ShiftWithDetails[]>()
    for (const s of shifts) {
      if (s.assigned_date) {
        const existing = map.get(s.assigned_date) ?? []
        existing.push(s)
        map.set(s.assigned_date, existing)
      }
    }
    return map
  }, [shifts])

  const shiftsForSelectedDate = selectedDate ? (monthShiftsMap.get(selectedDate) ?? []) : []

  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
  const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
  const startDayOfWeek = monthStart.getDay()
  const today = toDateString(new Date())

  const calendarDays: (number | null)[] = []
  for (let i = 0; i < startDayOfWeek; i++) calendarDays.push(null)
  for (let d = 1; d <= monthEnd.getDate(); d++) calendarDays.push(d)

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
    setSelectedDate(null)
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
    setSelectedDate(null)
  }

  const handleDayClick = (day: number) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    setSelectedDate(dateStr)
  }

  if (loading) return <CalendarSkeleton />

  if (error) {
    return (
      <div className="mb-8">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">Mi Agenda</h2>
        <div className="rounded-xl bg-white p-8 text-center text-sm text-red-500 shadow-sm">
          {error}
        </div>
      </div>
    )
  }

  if (shifts.length === 0) {
    return (
      <div className="mb-8">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">Mi Agenda</h2>
        <div className="flex flex-col items-center gap-3 rounded-xl bg-white p-8 text-center shadow-sm">
          <CalendarDays className="h-12 w-12 text-gray-300" />
          <p className="text-sm text-gray-500">No tenés turnos asignados todavía</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-8">
      <h2 className="mb-4 text-xl font-semibold text-gray-900">Mi Agenda</h2>
      <div className="rounded-xl bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-semibold text-gray-700">
              {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={prevMonth}
              className="rounded-lg p-1 text-gray-500 transition-colors hover:bg-gray-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={nextMonth}
              className="rounded-lg p-1 text-gray-500 transition-colors hover:bg-gray-100"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-7 border-b border-gray-200 pb-2">
            {DAYS.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-gray-500">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 pt-1">
            {calendarDays.map((day, i) => {
              const dateStr = day
                ? `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                : null
              const dayShifts = dateStr ? (monthShiftsMap.get(dateStr) ?? []) : []
              const hasShift = dayShifts.length > 0
              const isSelected = dateStr === selectedDate
              const isToday = dateStr === today

              return (
                <button
                  key={i}
                  disabled={!day || !hasShift}
                  onClick={() => { if (day) handleDayClick(day) }}
                  className={`relative flex flex-col items-center py-2 text-sm transition-all ${
                    !day
                      ? 'cursor-default'
                      : !hasShift
                        ? 'text-gray-300 cursor-default'
                        : isSelected
                          ? 'bg-blue-50 text-blue-700 font-semibold cursor-pointer'
                          : isToday
                            ? 'ring-1 ring-blue-300 text-gray-700 hover:bg-gray-50 cursor-pointer'
                            : 'hover:bg-gray-50 text-gray-700 cursor-pointer'
                  }`}
                >
                  {day && (
                    <>
                      <span>{day}</span>
                      {hasShift && (
                        <span className={`mt-0.5 h-1.5 w-1.5 rounded-full ${getDotColor(dayShifts)}`} />
                      )}
                    </>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {selectedDate && shiftsForSelectedDate.length > 0 && (
          <div className="border-t border-gray-200 px-6 py-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">
              Turnos del {formatISODate(selectedDate)}
            </h3>
            <div className="space-y-3">
              {shiftsForSelectedDate.map((shift) => (
                <div
                  key={shift.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4 transition-colors hover:bg-gray-100"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-900">
                      {shift.specialty?.name ?? '—'}
                    </p>
                    {shift.assigned_time && (
                      <p className="text-sm text-gray-500">
                        {shift.assigned_time.slice(0, 5)} hs
                      </p>
                    )}
                  </div>
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeColors[shift.status] ?? 'bg-gray-100 text-gray-800'}`}
                  >
                    {statusLabels[shift.status] ?? shift.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedDate && shiftsForSelectedDate.length === 0 && (
          <div className="border-t border-gray-200 px-6 py-4">
            <p className="text-sm text-gray-400">No hay turnos en esta fecha.</p>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-yellow-400" /> Pendiente
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-green-500" /> Aprobado
        </span>
      </div>
    </div>
  )
}
