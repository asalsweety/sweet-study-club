import { minuteLabel, tehranClock } from '../../shared/lib/tehran'

export const formText = (form: FormData, key: string) => String(form.get(key) ?? '').trim()

export function tehranInput(iso: string) {
  const local = tehranClock(Date.parse(iso))
  return `${local.date}T${minuteLabel(local.minuteOfDay)}`
}

export function fromTehranInput(value: string) {
  const timestamp = Date.parse(`${value}+03:30`)
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null
}
