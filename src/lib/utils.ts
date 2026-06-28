export function formatHour(h: number | null | undefined): string | null {
  if (h === null || h === undefined) return null
  return `${String(h).padStart(2, '0')}:00`
}
