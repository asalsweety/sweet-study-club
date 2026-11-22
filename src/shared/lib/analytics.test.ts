import { describe, expect, it } from 'vitest'
import { konkurPercent, percentChange, periodRanges, periodStats, streaks, type AnalyticsLog } from './analytics'

// 08:30 UTC = 12:00 Tehran, safely inside the Tehran calendar day.
const log = (date: string, minutes: number, subjectName = 'زیست', tests = [0, 0, 0]): AnalyticsLog => ({
  subjectName,
  startedAt: `${date}T08:30:00.000Z`,
  durationSeconds: minutes * 60,
  testCount: tests[0] ?? 0,
  testsCorrect: tests[1] ?? 0,
  testsWrong: tests[2] ?? 0,
})

describe('konkurPercent', () => {
  it('applies negative marking', () => {
    expect(konkurPercent(30, 6, 40)).toBe(70)
    expect(konkurPercent(0, 0, 0)).toBeNull()
    expect(konkurPercent(0, 9, 10)).toBe(-30)
  })
})

describe('periodStats', () => {
  it('summarizes days, subjects, tests and bests', () => {
    const logs = [
      log('2026-10-03', 90, 'زیست', [40, 30, 6]),
      log('2026-10-03', 30, 'شیمی'),
      log('2026-10-05', 60, 'شیمی', [20, 10, 0]),
      log('2026-09-20', 500),
    ]
    const stats = periodStats(logs, '2026-10-03', '2026-10-09')

    expect(stats.totalSeconds).toBe(180 * 60)
    expect(stats.studyDays).toBe(2)
    expect(stats.averageSecondsPerStudyDay).toBe(90 * 60)
    expect(stats.bestDay).toEqual({ date: '2026-10-03', seconds: 120 * 60 })
    expect(stats.longestSessionSeconds).toBe(90 * 60)
    expect(stats.favoriteSubject).toBe('زیست')
    expect(stats.tests).toEqual({ total: 60, correct: 40, wrong: 6, percent: 63.3 })
    expect(stats.byDay).toHaveLength(7)
  })
})

describe('periodRanges', () => {
  it('starts weeks on Saturday', () => {
    // 2026-10-07 is a Wednesday; the Iranian week began Saturday 2026-10-03.
    expect(periodRanges('week', '2026-10-07')).toEqual({
      current: { from: '2026-10-03', to: '2026-10-09' },
      previous: { from: '2026-09-26', to: '2026-10-02' },
    })
  })

  it('uses full Persian months across Nowruz, including leap Esfand', () => {
    expect(periodRanges('month', '2026-03-15')).toEqual({
      current: { from: '2026-02-20', to: '2026-03-20' },
      previous: { from: '2026-01-21', to: '2026-02-19' },
    })
    expect(periodRanges('month', '2025-03-21')).toEqual({
      current: { from: '2025-03-21', to: '2025-04-20' },
      previous: { from: '2025-02-19', to: '2025-03-20' },
    })
  })
})

describe('streaks and change', () => {
  it('counts consecutive qualifying days', () => {
    const logs = [log('2026-10-04', 20), log('2026-10-05', 20), log('2026-10-06', 20), log('2026-10-01', 20)]
    expect(streaks(logs, '2026-10-07')).toEqual({ current: 3, best: 3 })
    expect(streaks(logs, '2026-10-09')).toEqual({ current: 0, best: 3 })
  })

  it('reports relative change', () => {
    expect(percentChange(150, 100)).toBe(50)
    expect(percentChange(5, 0)).toBeNull()
  })
})
