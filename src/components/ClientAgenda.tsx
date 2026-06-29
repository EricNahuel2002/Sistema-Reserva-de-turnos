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

function CalendarSkeleton({ compact }: { compact?: boolean }) {
  return (
    <div className={compact ? 'animate-pulse' : 'mb-8 animate-pulse'}>
      {!compact && <div className="mb-4 h-7 w-24 rounded bg-gray-200" />}
      <div className="rounded-xl bg-white shadow-sm">
        <div className={`flex items-center justify-between border-b border-gray-200 ${compact ? 'px-4 py-2.5' : 'px-6 py-4'}`}>
          <div className={`rounded bg-gray-200 ${compact ? 'h-5 w-28' : 'h-5 w-32'}`} />
          <div className={`rounded bg-gray-200 ${compact ? 'h-5 w-14' : 'h-5 w-16'}`} />
        </div>
        <div className={compact ? 'p-4' : 'p-6'}>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className={`rounded bg-gray-100 ${compact ? 'aspect-[3/2]' : 'aspect-square'}`} />
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
  compact?: boolean
}

export function ClientAgenda({ shifts: propShifts, loading: propLoading, compact }: Props) {
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

  if (loading) return <CalendarSkeleton compact={compact} />

  if (error) {
    return (
      <div className={compact ? '' : 'mb-8'}>
        {!compact && <h2 className="mb-4 text-xl font-semibold text-gray-900">Mi Agenda</h2>}
        <div className={`rounded-xl bg-white text-center text-sm text-red-500 shadow-sm ${compact ? 'p-5' : 'p-8'}`}>
          {error}
        </div>
      </div>
    )
  }

  if (shifts.length === 0) {
    return (
      <div className={compact ? '' : 'mb-8'}>
        {!compact && <h2 className="mb-4 text-xl font-semibold text-gray-900">Mi Agenda</h2>}
        <div className={`flex flex-col items-center gap-3 rounded-xl bg-white text-center shadow-sm ${compact ? 'p-5' : 'p-8'}`}>
          <CalendarDays className={compact ? 'h-10 w-10 text-gray-300' : 'h-12 w-12 text-gray-300'} />
          <p className="text-sm text-gray-500">No tenés turnos asignados todavía</p>
        </div>
      </div>
    )
  }

  return (
    <div className={compact ? '' : 'mb-8'}>
      {!compact && <h2 className="mb-4 text-xl font-semibold text-gray-900">Mi Agenda</h2>}
      <div className="rounded-xl bg-white shadow-sm">
        <div className={`flex items-center justify-between border-b border-gray-200 ${compact ? 'px-4 py-2.5' : 'px-6 py-4'}`}>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-blue-600" />
            <span className="font-semibold text-gray-700 text-sm">
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

        <div className={compact ? 'p-4' : 'p-6'}>
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
                  className={`relative flex flex-col items-center transition-all ${
                    compact ? 'py-1.5 text-sm' : 'py-2 text-sm'
                  } ${
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
                        <span className={`mt-0.5 rounded-full h-1.5 w-1.5 ${getDotColor(dayShifts)}`} />
                      )}
                    </>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {compact && !selectedDate && shifts.length > 0 && (
          <div className="border-t border-gray-200 px-4 py-3">
            <p className="text-sm text-gray-600">
              Tenés {shifts.length} turno{shifts.length !== 1 ? 's' : ''} próximo{shifts.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}

        {selectedDate && shiftsForSelectedDate.length > 0 && (
          <div className={`border-t border-gray-200 ${compact ? 'max-h-60 overflow-y-auto px-4 py-3' : 'px-6 py-4'}`}>
            <h3 className="mb-3 font-semibold text-gray-700 text-sm">
              Turnos del {formatISODate(selectedDate)}
            </h3>
            <div className={compact ? 'space-y-2' : 'space-y-3'}>
              {shiftsForSelectedDate.map((shift) => (
                <div
                  key={shift.id}
                  className={`flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 transition-colors hover:bg-gray-100 ${compact ? 'p-3' : 'p-4'}`}
                >
                  <div className="space-y-1">
                    <p className="font-medium text-gray-900 text-sm">
                      {shift.specialty?.name ?? '—'}
                    </p>
                    {shift.assigned_time && (
                      <p className={`text-gray-500 ${compact ? 'text-xs' : 'text-sm'}`}>
                        {shift.assigned_time.slice(0, 5)} hs
                      </p>
                    )}
                  </div>
                  <span
                    className={`inline-block rounded-full font-medium ${statusBadgeColors[shift.status] ?? 'bg-gray-100 text-gray-800'} ${compact ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-0.5 text-xs'}`}
                  >
                    {statusLabels[shift.status] ?? shift.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedDate && shiftsForSelectedDate.length === 0 && (
          <div className={`border-t border-gray-200 ${compact ? 'px-4 py-3' : 'px-6 py-4'}`}>
            <p className="text-gray-400 text-sm">No hay turnos en esta fecha.</p>
          </div>
        )}
      </div>

      <div className={`flex items-center gap-4 text-gray-500 text-xs ${compact ? 'mt-2.5' : 'mt-3'}`}>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-green-500" /> Aprobado
        </span>
      </div>
    </div>
  )
}
