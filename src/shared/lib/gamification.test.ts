import { describe, expect, it } from 'vitest'
import type { AnalyticsLog } from './analytics'
import { earnedBadgeIds, experienceFor, levelProgress, studyDna } from './gamification'

// 18:30 UTC = 22:00 Tehran.
const nightLog = (date: string, minutes: number, correct = 0): AnalyticsLog => ({
  subjectName: 'فیزیک',
  startedAt: `${date}T18:30:00.000Z`,
  durationSeconds: minutes * 60,
  testCount: correct,
  testsCorrect: correct,
  testsWrong: 0,
})

describe('levels', () => {
  it('maps experience to levels and progress', () => {
    expect(levelProgress(0)).toMatchObject({ level: 1, nextLevelAt: 100, progress: 0 })
    expect(levelProgress(150)).toMatchObject({ level: 2, levelStart: 100, nextLevelAt: 300, progress: 0.25 })
    expect(levelProgress(10_000_000).level).toBe(100)
  })

  it('awards minutes plus correct answers', () => {
    expect(experienceFor([nightLog('2026-10-01', 90, 10)])).toBe(110)
  })
})

describe('badges', () => {
  it('earns first study, first hour and streak badges', () => {
    const logs = ['2026-10-01', '2026-10-02', '2026-10-03'].map((date) => nightLog(date, 65))
    const ids = earnedBadgeIds(logs, '2026-10-03', false)
    expect(ids).toEqual(expect.arrayContaining(['first-study', 'first-hour', 'streak-3']))
    expect(ids).not.toContain('founder')
  })
})

describe('study dna', () => {
  it('stays discovering with few sessions', () => {
    expect(studyDna([nightLog('2026-10-01', 30)]).chronotype).toBe('discovering')
  })

  it('detects a deep-focus night owl', () => {
    const logs = ['01', '02', '03', '04', '05', '06'].map((day) => nightLog(`2026-10-${day}`, 70))
    const dna = studyDna(logs)
    expect(dna).toMatchObject({ chronotype: 'night-owl', style: 'deep-focus', preferredHour: 22, sessionsAnalyzed: 6 })
  })
})
