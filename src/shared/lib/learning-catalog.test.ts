import { describe, expect, it } from 'vitest'
import { importPackSchema, scoreInputSchema } from '../api/learning'
import { examResult, learningTracks, reviewInterval, validSubjects } from './learning-catalog'

describe('learning domain', () => {
  it('covers all medical paths without duplicate subjects, including critical reasoning', () => {
    expect(learningTracks).toHaveLength(6)
    for (const track of learningTracks) expect(new Set(track.subjects.map((s) => s.id)).size).toBe(track.subjects.length)
    expect(validSubjects('bachelor-medicine', ['reasoning', 'biochemistry'])).toBe(true)
    expect(validSubjects('dental-basics', ['oral-health', 'clinical-psychology'])).toBe(true)
    expect(validSubjects('residency', ['biology'])).toBe(false)
  })
  it('calculates negative marks and safely handles an empty exam', () => {
    expect(examResult([{ selectedIndex: 0, correctIndex: 0 }, { selectedIndex: 0, correctIndex: 1 }, { selectedIndex: null, correctIndex: 2 }]))
      .toEqual({ correct: 1, wrong: 1, skipped: 1, percent: 22.22 })
    expect(examResult([{ selectedIndex: 0, correctIndex: 1 }]).percent).toBe(-33.33)
    expect(examResult([]).percent).toBe(0)
  })
  it('spaces correct reviews out and resets mistakes', () => {
    expect([0, 1, 2, 4, 30, 60].map((d) => reviewInterval(d, true))).toEqual([1, 2, 4, 8, 60, 60])
    expect(reviewInterval(30, false)).toBe(1)
  })
  it('rejects impossible dates and forged private fields', () => {
    expect(scoreInputSchema.safeParse({ provider: 'maz', title: 'test', date: '2026-02-30', score: 6000, notes: '' }).success).toBe(false)
    expect(scoreInputSchema.safeParse({ provider: 'maz', title: 'test', date: '2026-02-28', score: 6000, notes: '', userId: 'another-user' }).success).toBe(false)
    expect(importPackSchema.safeParse({}).success).toBe(false)
  })
})
