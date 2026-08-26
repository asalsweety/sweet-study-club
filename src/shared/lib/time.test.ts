import { describe, expect, it } from 'vitest'
import {
  calculateElapsed,
  dateInTehran,
  findActiveScheduledSession,
  formatTimer,
} from './time'

describe('formatTimer', () => {
  it('formats elapsed seconds as a stable clock value', () => {
    expect(formatTimer(3661)).toBe('01:01:01')
    expect(formatTimer(-10)).toBe('00:00:00')
    expect(formatTimer(Number.NaN)).toBe('00:00:00')
  })
})

describe('calculateElapsed', () => {
  it('adds the running segment to previously accumulated time', () => {
    const now = Date.parse('2026-08-26T12:00:10.000Z')

    expect(
      calculateElapsed(
        {
          timer_status: 'running',
          current_segment_started_at: '2026-08-26T12:00:00.000Z',
          accumulated_seconds: 25,
        },
        now,
      ),
    ).toBe(35)
  })

  it('keeps paused and malformed timers stable', () => {
    expect(
      calculateElapsed({
        timer_status: 'paused',
        current_segment_started_at: '2026-08-26T12:00:00.000Z',
        accumulated_seconds: 25,
      }),
    ).toBe(25)

    expect(
      calculateElapsed({
        timer_status: 'running',
        current_segment_started_at: 'not-a-date',
        accumulated_seconds: 25,
      }),
    ).toBe(25)
  })
})

describe('findActiveScheduledSession', () => {
  const sessions = [
    {
      id: 'first',
      starts_at: '2026-08-26T12:00:00.000Z',
      ends_at: '2026-08-26T13:00:00.000Z',
    },
    {
      id: 'invalid',
      starts_at: 'invalid',
      ends_at: 'invalid',
    },
  ]

  it('includes the start boundary and excludes the end boundary', () => {
    expect(
      findActiveScheduledSession(
        sessions,
        Date.parse('2026-08-26T12:00:00.000Z'),
      )?.id,
    ).toBe('first')

    expect(
      findActiveScheduledSession(
        sessions,
        Date.parse('2026-08-26T13:00:00.000Z'),
      ),
    ).toBeUndefined()
  })
})

describe('dateInTehran', () => {
  it('calculates the calendar day in Tehran instead of UTC', () => {
    expect(dateInTehran(Date.parse('2026-08-26T21:00:00.000Z'))).toBe(
      '2026-08-27',
    )
  })
})
