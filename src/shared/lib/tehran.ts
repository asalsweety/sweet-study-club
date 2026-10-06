// Iran has observed a fixed UTC+03:30 offset since DST was abolished in 2022,
// so Tehran wall-clock math does not need a timezone database.
export const TEHRAN_OFFSET_MINUTES = 210

const MINUTE = 60_000
const DAY = 24 * 60 * MINUTE

export type TehranClock = {
  date: string
  minuteOfDay: number
  weekday: number
}

const pad = (value: number) => String(value).padStart(2, '0')

export function tehranClock(epochMs: number): TehranClock {
  const shifted = new Date(epochMs + TEHRAN_OFFSET_MINUTES * MINUTE)
  return {
    date: `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`,
    minuteOfDay: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
    // 0 = Saturday, the first day of the Iranian week.
    weekday: (shifted.getUTCDay() + 1) % 7,
  }
}

/** Epoch ms of a Tehran wall-clock minute on a Tehran calendar date. */
export function tehranDateMinuteToEpoch(date: string, minuteOfDay: number) {
  const [year, month, day] = date.split('-').map(Number)
  return (
    Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1) -
    TEHRAN_OFFSET_MINUTES * MINUTE +
    minuteOfDay * MINUTE
  )
}

export function startOfTehranDay(date: string) {
  return tehranDateMinuteToEpoch(date, 0)
}

export function addDays(date: string, days: number) {
  return tehranClock(startOfTehranDay(date) + days * DAY + 12 * 60 * MINUTE).date
}

export function minuteLabel(minuteOfDay: number) {
  return `${pad(Math.floor(minuteOfDay / 60) % 24)}:${pad(minuteOfDay % 60)}`
}
