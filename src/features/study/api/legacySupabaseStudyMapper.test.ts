import { describe, expect, it } from 'vitest'
import {
  mapLegacyActiveStudyState,
  mapLegacyStudySession,
  readLegacyStopDuration,
} from './legacySupabaseStudyMapper'

describe('legacy Supabase study mapper', () => {
  it('translates a legacy schedule row into the domain model', () => {
    expect(
      mapLegacyStudySession({
        id: 'session-1',
        title: 'زیست',
        session_date: '2026-08-26',
        starts_at: '2026-08-26T10:00:00.000Z',
        ends_at: '2026-08-26T11:00:00.000Z',
        is_cancelled: false,
      }),
    ).toEqual({
      id: 'session-1',
      title: 'زیست',
      sessionDate: '2026-08-26',
      startsAt: '2026-08-26T10:00:00.000Z',
      endsAt: '2026-08-26T11:00:00.000Z',
      isCancelled: false,
    })
  })

  it('rejects an impossible negative accumulated duration', () => {
    expect(() =>
      mapLegacyActiveStudyState({
        user_id: 'user-1',
        log_id: 'log-1',
        mode: 'free',
        subject_name: 'ریاضی',
        session_id: null,
        timer_status: 'paused',
        started_at: '2026-08-26T10:00:00.000Z',
        current_segment_started_at: null,
        paused_at: '2026-08-26T10:30:00.000Z',
        accumulated_seconds: -1,
        focus_lock_enabled: false,
      }),
    ).toThrow()
  })

  it('reads a valid stop duration and ignores malformed results', () => {
    expect(
      readLegacyStopDuration([{ final_duration_seconds: 3600 }]),
    ).toBe(3600)
    expect(readLegacyStopDuration([])).toBeUndefined()
    expect(
      readLegacyStopDuration([{ final_duration_seconds: -1 }]),
    ).toBeUndefined()
  })
})
