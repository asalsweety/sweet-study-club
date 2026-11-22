import { addDays, tehranClock } from './tehran'

export type AnalyticsLog = {
  subjectName: string
  startedAt: string
  durationSeconds: number
  testCount: number
  testsCorrect: number
  testsWrong: number
}

export type DayTotal = { date: string; seconds: number; sessions: number; tests: number }
export type SubjectTotal = { name: string; seconds: number; tests: number; percent: number | null }

export type PeriodStats = {
  from: string
  to: string
  totalSeconds: number
  sessions: number
  studyDays: number
  averageSecondsPerStudyDay: number
  bestDay: { date: string; seconds: number } | null
  longestSessionSeconds: number
  favoriteSubject: string | null
  tests: { total: number; correct: number; wrong: number; percent: number | null }
  bySubject: SubjectTotal[]
  byDay: DayTotal[]
}

/** Konkur scoring: every 3 wrong answers cancel one correct answer. */
export function konkurPercent(correct: number, wrong: number, total: number) {
  if (total <= 0) return null
  return Math.round(((correct * 3 - wrong) / (total * 3)) * 1000) / 10
}

const logDate = (log: AnalyticsLog) => tehranClock(Date.parse(log.startedAt)).date

export function dailyTotals(logs: readonly AnalyticsLog[]) {
  const totals = new Map<string, DayTotal>()
  for (const log of logs) {
    const date = logDate(log)
    const day = totals.get(date) ?? { date, seconds: 0, sessions: 0, tests: 0 }
    day.seconds += log.durationSeconds
    day.sessions += 1
    day.tests += log.testCount
    totals.set(date, day)
  }
  return totals
}

export function periodStats(logs: readonly AnalyticsLog[], from: string, to: string): PeriodStats {
  const inRange = logs.filter((log) => {
    const date = logDate(log)
    return date >= from && date <= to
  })
  const days = dailyTotals(inRange)
  const byDay: DayTotal[] = []
  for (let date = from; date <= to; date = addDays(date, 1)) {
    byDay.push(days.get(date) ?? { date, seconds: 0, sessions: 0, tests: 0 })
  }

  const subjects = new Map<string, { seconds: number; tests: number; correct: number; wrong: number }>()
  let longest = 0
  let correct = 0
  let wrong = 0
  let tests = 0
  for (const log of inRange) {
    const subject = subjects.get(log.subjectName) ?? { seconds: 0, tests: 0, correct: 0, wrong: 0 }
    subject.seconds += log.durationSeconds
    subject.tests += log.testCount
    subject.correct += log.testsCorrect
    subject.wrong += log.testsWrong
    subjects.set(log.subjectName, subject)
    longest = Math.max(longest, log.durationSeconds)
    correct += log.testsCorrect
    wrong += log.testsWrong
    tests += log.testCount
  }

  const bySubject = [...subjects.entries()]
    .map(([name, value]) => ({
      name,
      seconds: value.seconds,
      tests: value.tests,
      percent: konkurPercent(value.correct, value.wrong, value.tests),
    }))
    .sort((left, right) => right.seconds - left.seconds)

  const studied = byDay.filter((day) => day.seconds > 0)
  const totalSeconds = studied.reduce((sum, day) => sum + day.seconds, 0)
  const best = studied.reduce<DayTotal | null>((top, day) => (top === null || day.seconds > top.seconds ? day : top), null)

  return {
    from,
    to,
    totalSeconds,
    sessions: inRange.length,
    studyDays: studied.length,
    averageSecondsPerStudyDay: studied.length === 0 ? 0 : Math.round(totalSeconds / studied.length),
    bestDay: best === null ? null : { date: best.date, seconds: best.seconds },
    longestSessionSeconds: longest,
    favoriteSubject: bySubject[0]?.name ?? null,
    tests: { total: tests, correct, wrong, percent: konkurPercent(correct, wrong, tests) },
    bySubject,
    byDay,
  }
}

/** Relative change in percent; null when there is nothing to compare with. */
export function percentChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null
  return Math.round(((current - previous) / previous) * 100)
}

export type PeriodKind = 'day' | 'week' | 'month'

const persianDay = new Intl.DateTimeFormat('en-US-u-ca-persian', { day: 'numeric', timeZone: 'Asia/Tehran' })

function startOfPersianMonth(date: string) {
  const day = Number(persianDay.format(Date.parse(`${date}T12:00:00Z`)))
  return addDays(date, 1 - day)
}

/** Tehran calendar ranges with Saturday weeks and Persian months. */
export function periodRanges(kind: PeriodKind, today: string) {
  if (kind === 'day') {
    return { current: { from: today, to: today }, previous: { from: addDays(today, -1), to: addDays(today, -1) } }
  }
  if (kind === 'week') {
    const offset = tehranClock(Date.parse(`${today}T12:00:00Z`)).weekday
    const from = addDays(today, -offset)
    return { current: { from, to: addDays(from, 6) }, previous: { from: addDays(from, -7), to: addDays(from, -1) } }
  }
  const from = startOfPersianMonth(today)
  const previousEnd = addDays(from, -1)
  // Every Persian month is 29–31 days long, so this lands in the following month.
  const nextFrom = startOfPersianMonth(addDays(from, 31))
  return {
    current: { from, to: addDays(nextFrom, -1) },
    previous: { from: startOfPersianMonth(previousEnd), to: previousEnd },
  }
}

/** Consecutive days with at least `minimumSeconds` of study. */
export function streaks(logs: readonly AnalyticsLog[], today: string, minimumSeconds = 600) {
  return streaksFromDays(dailyTotals(logs), today, minimumSeconds)
}

/** Also accepts database day aggregates, without materializing every session. */
export function streaksFromDays(days: ReadonlyMap<string, DayTotal>, today: string, minimumSeconds = 600) {
  const qualifies = (date: string) => (days.get(date)?.seconds ?? 0) >= minimumSeconds
  let current = 0
  // Today still counts as "in progress": a streak survives until today ends.
  let cursor = qualifies(today) ? today : addDays(today, -1)
  while (qualifies(cursor)) {
    current += 1
    cursor = addDays(cursor, -1)
  }
  let best = 0
  let run = 0
  let previous: string | null = null
  for (const date of [...days.keys()].sort()) {
    if (!qualifies(date)) continue
    run = previous !== null && addDays(previous, 1) === date ? run + 1 : 1
    best = Math.max(best, run)
    previous = date
  }
  return { current, best: Math.max(best, current) }
}
