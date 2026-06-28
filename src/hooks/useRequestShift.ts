import { useState } from 'react'
import { createShift } from '../services/shift.service'

export function useRequestShift() {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  async function requestAppointment(specialtyId: string) {
    setSubmitting(true)
    setError(null)
    setSuccessMessage(null)
    try {
      await createShift(specialtyId)
      setSuccessMessage('Turno solicitado con éxito')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al solicitar el turno')
    } finally {
      setSubmitting(false)
    }
  }

  function reset() {
    setError(null)
    setSuccessMessage(null)
  }

  return { submitting, error, successMessage, requestAppointment, reset }
}
