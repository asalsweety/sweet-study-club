import type { StartStudyTimerInput } from '../../../entities/study/model'
import { supabase } from '../../../lib/supabase'
import {
  mapLegacyActiveStudyState,
  mapLegacyStudySession,
  readLegacyStopDuration,
} from './legacySupabaseStudyMapper'

export const legacySupabaseStudyApi = {
  async listSessionsForDate(sessionDate: string) {
    const { data, error } = await supabase
      .from('study_sessions')
      .select(
        'id, title, session_date, starts_at, ends_at, is_cancelled',
      )
      .eq('session_date', sessionDate)
      .eq('is_cancelled', false)
      .order('starts_at', { ascending: true })

    if (error) throw error
    return (data ?? []).map(mapLegacyStudySession)
  },

  async getActiveState() {
    const { data, error } = await supabase
      .from('active_study_states')
      .select(
        'user_id, log_id, mode, subject_name, session_id, timer_status, started_at, current_segment_started_at, paused_at, accumulated_seconds, focus_lock_enabled',
      )
      .maybeSingle()

    if (error) throw error
    return data === null ? null : mapLegacyActiveStudyState(data)
  },

  async startTimer(input: StartStudyTimerInput) {
    const { error } = await supabase.rpc('start_study_timer', {
      requested_mode: input.mode,
      requested_subject: input.subject,
      requested_session_id: input.sessionId,
      requested_focus_lock: input.focusLockEnabled,
    })

    if (error) throw error
  },

  async pauseTimer() {
    const { error } = await supabase.rpc('pause_study_timer')
    if (error) throw error
  },

  async resumeTimer() {
    const { error } = await supabase.rpc('resume_study_timer')
    if (error) throw error
  },

  async stopTimer() {
    const { data, error } = await supabase.rpc('stop_study_timer')
    if (error) throw error

    return readLegacyStopDuration(data)
  },
}
