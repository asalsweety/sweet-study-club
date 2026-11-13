const persianDigits = new Intl.NumberFormat('fa-IR', { useGrouping: false })
const persianGrouped = new Intl.NumberFormat('fa-IR')

export const fa = (value: number) => persianDigits.format(value)
export const faGrouped = (value: number) => persianGrouped.format(value)

const pad = (value: number) => fa(value).padStart(2, '۰')

/** 3725 -> "۰۱:۰۲:۰۵" (hours shown only when non-zero). */
export function formatClock(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const rest = seconds % 60
  return hours > 0 ? `${pad(hours)}:${pad(minutes)}:${pad(rest)}` : `${pad(minutes)}:${pad(rest)}`
}

/** 8100 -> "۲ ساعت و ۱۵ دقیقه"; under a minute -> "کمتر از یک دقیقه". */
export function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(Math.max(0, totalSeconds) / 60)
  if (minutes === 0) return 'کمتر از یک دقیقه'
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${fa(rest)} دقیقه`
  return rest === 0 ? `${fa(hours)} ساعت` : `${fa(hours)} ساعت و ${fa(rest)} دقیقه`
}

/** Compact "۲:۱۵" style hours, used in charts and chips. */
export function formatHours(totalSeconds: number) {
  const minutes = Math.round(Math.max(0, totalSeconds) / 60)
  return `${fa(Math.floor(minutes / 60))}:${pad(minutes % 60)}`
}

export const formatToman = (value: number) => (value === 0 ? 'رایگان' : `${faGrouped(value)} تومان`)

export function daysUntil(isoDate: string, now = Date.now()) {
  const target = Date.parse(`${isoDate}T00:00:00+03:30`)
  return Math.ceil((target - now) / 86_400_000)
}

const weekdayFormatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { weekday: 'long', timeZone: 'Asia/Tehran' })
const dateFormatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { day: 'numeric', month: 'long', timeZone: 'Asia/Tehran' })
const shortFormatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { day: 'numeric', month: 'short', timeZone: 'Asia/Tehran' })
const timeFormatter = new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Tehran' })

/** "2026-10-07" -> Jalali "۱۵ مهر" (rendered in Persian calendar). */
export const jalaliDay = (isoDate: string) => dateFormatter.format(new Date(`${isoDate}T12:00:00+03:30`))
export const jalaliShort = (isoDate: string) => shortFormatter.format(new Date(`${isoDate}T12:00:00+03:30`))
const fullDateFormatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Tehran' })
/** "2027-06-24" -> Jalali "۳ تیر ۱۴۰۶". */
export const jalaliFullDate = (isoDate: string) => fullDateFormatter.format(new Date(`${isoDate}T12:00:00+03:30`))
export const weekdayName = (isoDate: string) => weekdayFormatter.format(new Date(`${isoDate}T12:00:00+03:30`))
export const clockTime = (iso: string) => timeFormatter.format(new Date(iso))

export function greeting(now = new Date()) {
  const hour = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: 'Asia/Tehran' }).format(now))
  if (hour < 5) return 'شب بخیر'
  if (hour < 12) return 'صبح بخیر'
  if (hour < 17) return 'ظهر بخیر'
  return 'عصر بخیر'
}
