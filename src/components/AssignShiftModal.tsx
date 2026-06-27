import { useState, useEffect, useMemo, useCallback } from 'react'
import type { ShiftWithDetails } from '../types'
import { assignShift, getShiftsByDateRange } from '../services/shift.service'
import { X, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react'

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const DAY_OF_WEEK_MAP: Record<string, number> = {
  domingo: 0,
  lunes: 1,
  martes: 2,
  miércoles: 3,
  jueves: 4,
  viernes: 5,
  sábado: 6,
}

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

function toDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getMonthRange(date: Date): { from: string; to: string } {
  const year = date.getFullYear()
  const month = date.getMonth()
  const from = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const lastDay = new Date(year, month + 1, 0).getDate()
  const to = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { from, to }
}

function generateTimeSlots(from: number, until: number): string[] {
  const slots: string[] = []
  for (let h = from; h < until; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`)
    slots.push(`${String(h).padStart(2, '0')}:30`)
  }
  return slots
}

function formatISODate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

type Props = {
  shift: ShiftWithDetails | null
  open: boolean
  onClose: () => void
  onAssigned: () => void
}

export function AssignShiftModal({ shift, open, onClose, onAssigned }: Props) {
  const today = toDateString(new Date())
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (shift?.assigned_date) return new Date(shift.assigned_date + 'T00:00:00')
    return new Date()
  })
  const [selectedDate, setSelectedDate] = useState<string | null>(shift?.assigned_date ?? null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [monthShifts, setMonthShifts] = useState<ShiftWithDetails[]>([])
  const [monthLoading, setMonthLoading] = useState(false)

  const resetState = useCallback(() => {
    const initialMonth = shift?.assigned_date ? new Date(shift.assigned_date + 'T00:00:00') : new Date()
    setCurrentMonth(initialMonth)
    setSelectedDate(shift?.assigned_date ?? null)
    setSelectedTime(null)
    setSubmitting(false)
    setError(null)
    setMonthShifts([])
  }, [shift])

  useEffect(() => {
    if (open) resetState()
  }, [open, resetState])

  useEffect(() => {
    if (!open || !shift) return
    setMonthLoading(true)
    setError(null)
    const { from, to } = getMonthRange(currentMonth)
    getShiftsByDateRange(from, to)
      .then(setMonthShifts)
      .catch((err) => setError(err instanceof Error ? err.message : 'Error al cargar horarios'))
      .finally(() => setMonthLoading(false))
  }, [open, currentMonth, shift])

  useEffect(() => {
    if (!shift?.assigned_date || !monthShifts.length) return
    const sameDay = monthShifts.find(
      (s) => s.id === shift.id && s.assigned_date === shift.assigned_date
    )
    if (sameDay?.assigned_time) {
      setSelectedTime(sameDay.assigned_time)
    }
  }, [monthShifts, shift])

  const { available_from: availableFrom, available_until: availableUntil, available_day: availableDay } = shift?.specialty ?? {}
  const allowedDayOfWeek = availableDay ? DAY_OF_WEEK_MAP[availableDay.toLowerCase()] : undefined

  const timeSlots = useMemo(() => {
    if (!selectedDate || availableFrom == null || availableUntil == null) return []
    return generateTimeSlots(availableFrom, availableUntil)
  }, [selectedDate, availableFrom, availableUntil])

  if (!open || !shift) return null

  const isPending = shift.status === 'pending'

  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
  const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
  const startDayOfWeek = monthStart.getDay()

  const calendarDays: (number | null)[] = []
  for (let i = 0; i < startDayOfWeek; i++) calendarDays.push(null)
  for (let d = 1; d <= monthEnd.getDate(); d++) calendarDays.push(d)

  const assignedDates = new Set<string>()
  const occupiedMap = new Map<string, { time: string; clientName: string }[]>()
  for (const s of monthShifts) {
    if (s.assigned_date) {
      assignedDates.add(s.assigned_date)
      if (s.assigned_time) {
        if (!occupiedMap.has(s.assigned_date)) occupiedMap.set(s.assigned_date, [])
        occupiedMap.get(s.assigned_date)!.push({
          time: s.assigned_time.slice(0, 5),
          clientName: s.client?.full_name ?? '—',
        })
      }
    }
  }

  const occupiedTimesForSelectedDate = (occupiedMap.get(selectedDate ?? '') ?? []).filter(
    (o) => !(shift.assigned_date === selectedDate && shift.assigned_time?.startsWith(o.time))
  )

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))

  const handleDayClick = (day: number) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    if (dateStr < today) return
    setSelectedDate(dateStr)
    setSelectedTime(null)
    setError(null)
  }

  const handleTimeClick = (time: string) => {
    setSelectedTime(time)
    setError(null)
  }

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime || !isPending) return
    setSubmitting(true)
    setError(null)
    try {
      await assignShift(shift.id, selectedDate, selectedTime)
      onAssigned()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al asignar el horario')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Gestionar Turno</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-6">
          {/* Shift detail */}
          <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Paciente</span>
                <p className="font-medium text-gray-900">{shift.client?.full_name ?? '—'}</p>
              </div>
              <div>
                <span className="text-gray-500">DNI</span>
                <p className="font-medium text-gray-900">{shift.client?.dni ?? '—'}</p>
              </div>
              <div>
                <span className="text-gray-500">Especialidad</span>
                <p className="font-medium text-gray-900">{shift.specialty?.name ?? '—'}</p>
              </div>
              <div>
                <span className="text-gray-500">Estado</span>
                <p>
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[shift.status]}`}>
                    {statusLabels[shift.status]}
                  </span>
                </p>
              </div>
              {shift.assigned_date && (
                <div className="col-span-2">
                  <span className="text-gray-500">Horario asignado actualmente</span>
                      <p className="font-medium text-gray-900">
                        {formatISODate(shift.assigned_date)}
                        {shift.assigned_time ? ` ${shift.assigned_time.slice(0, 5)}` : ''}
                  </p>
                </div>
              )}
              <div className="col-span-2">
                <span className="text-gray-500">Creado</span>
                <p className="font-medium text-gray-900">
                  {new Date(shift.created_at).toLocaleDateString('es-AR')}
                </p>
              </div>
            </div>
          </div>

          {/* Assignment form */}
          {isPending ? (
            <>
              {error && (
                <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              {/* Calendar */}
              <div className="mb-6">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700">
                    Seleccioná un día
                  </h3>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={prevMonth}
                      className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-sm font-medium text-gray-700 min-w-[140px] text-center">
                      {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                    </span>
                    <button
                      onClick={nextMonth}
                      className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200">
                  <div className="grid grid-cols-7 border-b border-gray-200">
                    {DAYS.map((d) => (
                      <div key={d} className="py-2 text-center text-xs font-medium text-gray-500">
                        {d}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7">
                    {calendarDays.map((day, i) => {
                      const dateStr = day
                        ? `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                        : null
                      const isToday = dateStr === today
                      const isSelected = dateStr === selectedDate
                      const isPast = dateStr != null && dateStr < today
                      const hasShifts = dateStr != null && assignedDates.has(dateStr)
                      const dayOfWeek = day ? new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day).getDay() : -1
                      const isAllowedDay = allowedDayOfWeek == null || dayOfWeek === allowedDayOfWeek
                      const isDisabled = isPast || !isAllowedDay

                      return (
                        <button
                          key={i}
                          disabled={!day || isDisabled}
                          onClick={() => day && handleDayClick(day)}
                          className={`relative flex flex-col items-center py-2 text-sm transition-colors ${
                            !day
                              ? 'cursor-default'
                              : isDisabled
                                ? 'cursor-not-allowed text-gray-300'
                                : isSelected
                                  ? 'bg-blue-50 text-blue-700 font-semibold'
                                  : isToday
                                    ? 'ring-1 ring-blue-300 text-gray-700 hover:bg-gray-50'
                                    : 'hover:bg-gray-50 text-gray-700'
                          } ${day ? 'cursor-pointer' : ''}`}
                        >
                          {day && (
                            <>
                              <span>{day}</span>
                              {hasShifts && (
                                <span className="mt-0.5 h-1 w-1 rounded-full bg-blue-500" />
                              )}
                            </>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {monthLoading && (
                  <div className="mt-2 text-center text-sm text-gray-400">Cargando horarios...</div>
                )}
              </div>

              {/* Time slots */}
              {selectedDate && timeSlots.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-gray-700">
                    Horarios disponibles para el{' '}
                    {formatISODate(selectedDate)}
                  </h3>
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                    {timeSlots.map((time) => {
                      const occupant = occupiedTimesForSelectedDate.find((o) => o.time === time)
                      const isOwnSlot = shift.assigned_date === selectedDate && shift.assigned_time === time
                      const isBusy = !!occupant
                      const isSelectedSlot = selectedTime === time

                      return (
                        <button
                          key={time}
                          disabled={isBusy && !isOwnSlot}
                          onClick={() => handleTimeClick(time)}
                          className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                            isSelectedSlot
                              ? 'border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600'
                              : isOwnSlot && isBusy
                                ? 'border-blue-400 bg-blue-50 text-blue-700'
                                : isBusy
                                  ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
                                  : 'border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                          }`}
                          title={isBusy && !isOwnSlot ? `Ocupado por ${occupant.clientName}` : undefined}
                        >
                          <span>{time}</span>
                          {isOwnSlot && isBusy && (
                            <span className="block text-[10px] text-blue-500">(actual)</span>
                          )}
                          {isBusy && !isOwnSlot && (
                            <span className="block truncate text-[10px] text-gray-400">
                              {occupant?.clientName}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {selectedDate && timeSlots.length === 0 && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-500">
                  No hay horarios disponibles para esta especialidad en el día seleccionado.
                </div>
              )}

              {/* Submit */}
              <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-4">
                <button
                  onClick={onClose}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!selectedDate || !selectedTime || submitting}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? 'Asignando...' : 'Asignar Horario'}
                </button>
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-500">
              {shift.status === 'approved'
                ? 'Este turno ya fue aprobado y tiene un horario asignado.'
                : 'Este turno fue cancelado.'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
