import { streaks, type AnalyticsLog } from './analytics'
import { tehranClock } from './tehran'

export const MAX_LEVEL = 100

/** 1 XP per studied minute plus 2 XP per correct test answer. */
export function experienceFor(logs: readonly AnalyticsLog[]) {
  return logs.reduce((sum, log) => sum + Math.floor(log.durationSeconds / 60) + log.testsCorrect * 2, 0)
}

/** Total XP needed to reach a level: 0, 100, 300, 600, ... (50·L·(L-1)). */
export const experienceForLevel = (level: number) => 50 * level * (level - 1)

export function levelProgress(experience: number) {
  let level = 1
  while (level < MAX_LEVEL && experience >= experienceForLevel(level + 1)) level += 1
  const floor = experienceForLevel(level)
  const ceiling = level === MAX_LEVEL ? floor : experienceForLevel(level + 1)
  return {
    level,
    experience,
    levelStart: floor,
    nextLevelAt: ceiling,
    progress: ceiling === floor ? 1 : (experience - floor) / (ceiling - floor),
  }
}

export type BadgeDefinition = {
  id: string
  title: string
  description: string
  emoji: string
  tier: 'bronze' | 'silver' | 'gold' | 'special'
}

type BadgeFacts = {
  totalHours: number
  sessions: number
  longestMinutes: number
  bestStreak: number
  tests: number
  isFounder: boolean
}

type BadgeRule = BadgeDefinition & { earned: (facts: BadgeFacts) => boolean }

const hourBadge = (hours: number, tier: BadgeDefinition['tier'], emoji: string): BadgeRule => ({
  id: `hours-${hours}`,
  title: `${hours} ساعت مطالعه`,
  description: `در مجموع ${hours} ساعت درس خواندی.`,
  emoji,
  tier,
  earned: (facts) => facts.totalHours >= hours,
})

const rules: BadgeRule[] = [
  { id: 'first-study', title: 'اولین قدم', description: 'اولین جلسه‌ی مطالعه‌ات را ثبت کردی.', emoji: '🌱', tier: 'bronze', earned: (f) => f.sessions >= 1 },
  { id: 'first-hour', title: 'یک ساعت پیوسته', description: 'یک جلسه‌ی ۶۰ دقیقه‌ای کامل.', emoji: '⏳', tier: 'bronze', earned: (f) => f.longestMinutes >= 60 },
  hourBadge(10, 'bronze', '📘'),
  hourBadge(50, 'silver', '📗'),
  hourBadge(100, 'silver', '📙'),
  hourBadge(250, 'gold', '🏅'),
  hourBadge(500, 'gold', '🏆'),
  hourBadge(1000, 'special', '👑'),
  { id: 'streak-3', title: 'سه روز پشت سر هم', description: 'سه روز پیاپی مطالعه.', emoji: '🔥', tier: 'bronze', earned: (f) => f.bestStreak >= 3 },
  { id: 'streak-7', title: 'یک هفته‌ی کامل', description: 'هفت روز پیاپی مطالعه.', emoji: '💫', tier: 'silver', earned: (f) => f.bestStreak >= 7 },
  { id: 'streak-30', title: 'ماه طلایی', description: 'سی روز پیاپی مطالعه.', emoji: '🌟', tier: 'gold', earned: (f) => f.bestStreak >= 30 },
  { id: 'sessions-50', title: 'پنجاه جلسه', description: 'پنجاه جلسه‌ی مطالعه ثبت شد.', emoji: '🎯', tier: 'silver', earned: (f) => f.sessions >= 50 },
  { id: 'tests-1000', title: 'هزار تست', description: 'هزار تست زدی.', emoji: '✍️', tier: 'gold', earned: (f) => f.tests >= 1000 },
  { id: 'founder', title: 'عضو بنیان‌گذار', description: 'از اولین اعضای Sweet Study Club.', emoji: '🎀', tier: 'special', earned: (f) => f.isFounder },
]

export const badgeCatalog: BadgeDefinition[] = rules.map(({ earned: _earned, ...badge }) => badge)

export function earnedBadgeIds(logs: readonly AnalyticsLog[], today: string, isFounder: boolean) {
  const facts: BadgeFacts = {
    totalHours: logs.reduce((sum, log) => sum + log.durationSeconds, 0) / 3600,
    sessions: logs.length,
    longestMinutes: Math.max(0, ...logs.map((log) => log.durationSeconds / 60)),
    bestStreak: streaks(logs, today).best,
    tests: logs.reduce((sum, log) => sum + log.testCount, 0),
    isFounder,
  }
  return rules.filter((rule) => rule.earned(facts)).map((rule) => rule.id)
}

export type StudyDnaType = 'early-bird' | 'afternoon-focus' | 'evening-scholar' | 'night-owl' | 'discovering'

export type StudyDna = {
  chronotype: StudyDnaType
  style: 'deep-focus' | 'sprint-learner' | 'balanced' | 'discovering'
  confidence: number
  sessionsAnalyzed: number
  averageSessionMinutes: number
  preferredHour: number | null
  hourlyMinutes: number[]
}

/** Study DNA from real sessions; under five sessions it stays "discovering". */
export function studyDna(logs: readonly AnalyticsLog[]): StudyDna {
  const hourly = Array.from({ length: 24 }, () => 0)
  for (const log of logs) {
    const minute = tehranClock(Date.parse(log.startedAt)).minuteOfDay
    const hour = Math.floor(minute / 60)
    hourly[hour] = (hourly[hour] ?? 0) + log.durationSeconds / 60
  }
  const sessions = logs.length
  const average = sessions === 0 ? 0 : logs.reduce((sum, log) => sum + log.durationSeconds, 0) / 60 / sessions
  const peak = hourly.indexOf(Math.max(...hourly))
  const sum = (from: number, to: number) => hourly.slice(from, to).reduce((total, value) => total + value, 0)
  const windows: [StudyDnaType, number][] = [
    ['early-bird', sum(4, 11)],
    ['afternoon-focus', sum(11, 17)],
    ['evening-scholar', sum(17, 21)],
    ['night-owl', sum(21, 24) + sum(0, 4)],
  ]
  const top = windows.reduce((best, entry) => (entry[1] > best[1] ? entry : best))
  const discovering = sessions < 5

  return {
    chronotype: discovering ? 'discovering' : top[0],
    style: discovering ? 'discovering' : average >= 50 ? 'deep-focus' : average <= 25 ? 'sprint-learner' : 'balanced',
    confidence: Math.min(1, Math.round((sessions / 30) * 100) / 100),
    sessionsAnalyzed: sessions,
    averageSessionMinutes: Math.round(average),
    preferredHour: sessions === 0 ? null : peak,
    hourlyMinutes: hourly.map((value) => Math.round(value)),
  }
}
