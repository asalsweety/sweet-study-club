export type StudySession = {
  id: string
  title: string
  sessionDate: string
  startsAt: string
  endsAt: string
  isCancelled: boolean
}

export type ActiveStudyState = {
  userId: string
  logId: string
  mode: 'free' | 'scheduled' | 'pomodoro'
  subjectName: string
  sessionId: string | null
  timerStatus: 'running' | 'paused'
  startedAt: string
  currentSegmentStartedAt: string | null
  pausedAt: string | null
  accumulatedSeconds: number
  focusLockEnabled: boolean
}

export type StartStudyTimerInput = {
  mode: 'free' | 'scheduled'
  subject: string
  sessionId: string | null
  focusLockEnabled: boolean
}

export const studySubjects = [
  'زیست',
  'شیمی',
  'فیزیک',
  'ریاضی',
  'ادبیات',
  'دینی',
  'زبان',
  'تست جامع',
  'مرور',
] as const
