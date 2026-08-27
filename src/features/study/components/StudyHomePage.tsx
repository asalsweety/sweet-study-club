import { lazy } from 'react'
import {
  BookOpen,
  CalendarClock,
  Clock3,
  Pause,
  Play,
  Sparkles,
  Square,
  UserRound,
} from 'lucide-react'
import type { Profile } from '../../../entities/profile/model'
import type {
  ActiveStudyState,
  StudySession,
} from '../../../entities/study/model'
import { formatTimer } from '../../../shared/lib/time'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card'
import { EmptyState } from '../../../components/ui/empty-state'

const LiveStudy = lazy(() => import('../../../components/LiveStudy'))

type StudyHomePageProps = {
  profile: Profile
  demoMode?: boolean
  sessions: readonly StudySession[]
  activeState: ActiveStudyState | null
  activeScheduledSession: StudySession | undefined
  elapsedSeconds: number
  working: boolean
  onOpenStartDialog: () => void
  onPause: () => void
  onResume: () => void
  onStop: () => void
}

function formatClock(value: string) {
  return new Intl.DateTimeFormat('fa-IR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tehran',
  }).format(new Date(value))
}

export default function StudyHomePage({
  profile,
  demoMode = false,
  sessions,
  activeState,
  activeScheduledSession,
  elapsedSeconds,
  working,
  onOpenStartDialog,
  onPause,
  onResume,
  onStop,
}: StudyHomePageProps) {
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-5 pb-28">
      <section className="grid gap-5 lg:grid-cols-[1.55fr_0.65fr]">
        <Card className="overflow-hidden border-primary/20 bg-card shadow-lg shadow-primary/5">
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div>
              <CardDescription>تایمر مطالعه من</CardDescription>
              <CardTitle className="mt-2 text-xl">
                {activeState
                  ? activeState.subjectName
                  : 'برای امروز آماده‌ای؟'}
              </CardTitle>
            </div>
            <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Clock3 size={24} />
            </span>
          </CardHeader>

          <CardContent>
            <strong
              className="block py-5 text-center font-mono text-5xl tracking-tight text-primary tabular-nums sm:text-7xl"
              dir="ltr"
              aria-label={`زمان سپری‌شده ${formatTimer(elapsedSeconds)}`}
            >
              {formatTimer(elapsedSeconds)}
            </strong>

            <div className="flex flex-wrap justify-center gap-2">
              {activeState ? (
                <>
                  {activeState.timerStatus === 'running' ? (
                    <Button onClick={onPause} disabled={working}>
                      <Pause /> توقف موقت
                    </Button>
                  ) : (
                    <Button onClick={onResume} disabled={working}>
                      <Play /> ادامه مطالعه
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    onClick={onStop}
                    disabled={working}
                  >
                    <Square /> پایان و ذخیره
                  </Button>
                </>
              ) : (
                <Button size="lg" onClick={onOpenStartDialog}>
                  <Play /> شروع مطالعه
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-secondary/55">
          <CardContent className="flex h-full flex-col justify-between gap-6 pt-6">
            <Badge variant="secondary" className="w-fit">
              {profile.role === 'admin' ? 'مدیر مجموعه' : 'عضو مجموعه'}
            </Badge>
            <div className="flex items-center gap-4">
              <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-primary text-2xl font-black text-primary-foreground">
                {profile.displayName.slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-xl font-black">
                  {profile.displayName}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  اتاق مطالعه Sweet Study
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <UserRound size={17} /> پروفایل و تنظیمات از بخش «حساب من»
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-4">
            <div>
              <CardDescription>برنامه امروز</CardDescription>
              <CardTitle className="mt-1">پارت‌های درسی</CardTitle>
            </div>
            <Badge variant="outline">
              {sessions.length.toLocaleString('fa-IR')} پارت
            </Badge>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <EmptyState
                icon={<CalendarClock />}
                title="هنوز برنامه‌ای ثبت نشده"
                description="می‌توانی همین حالا یک مطالعه آزاد شروع کنی."
                action={
                  <Button variant="secondary" onClick={onOpenStartDialog}>
                    شروع مطالعه آزاد
                  </Button>
                }
              />
            ) : (
              <div className="grid gap-2">
                {sessions.map((studySession) => {
                  const isActive =
                    studySession.id === activeScheduledSession?.id

                  return (
                    <div
                      className="flex items-center justify-between gap-4 rounded-xl border bg-muted/40 p-4"
                      key={studySession.id}
                    >
                      <div>
                        <strong className="block">
                          {studySession.title}
                        </strong>
                        <span className="mt-1 block text-sm text-muted-foreground">
                          {formatClock(studySession.startsAt)} تا{' '}
                          {formatClock(studySession.endsAt)}
                        </span>
                      </div>
                      {isActive && <Badge>در حال برگزاری</Badge>}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-accent bg-accent/45">
          <CardHeader>
            <span className="mb-3 grid size-12 place-items-center rounded-2xl bg-accent text-accent-foreground">
              <Sparkles size={24} />
            </span>
            <CardTitle>مطالعه آزاد</CardTitle>
            <CardDescription className="leading-7">
              درس را انتخاب کن، تایمر را روشن کن و بدون محدودیت روی کارت تمرکز کن.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              variant="secondary"
              onClick={onOpenStartDialog}
              disabled={Boolean(activeState)}
            >
              <BookOpen /> انتخاب درس
            </Button>
          </CardContent>
        </Card>
      </section>

      {demoMode ? (
        <Card>
          <CardHeader>
            <CardTitle>دوستان آنلاین</CardTitle>
            <CardDescription>
              یک پیش‌نمایش از حضور اعضای اتاق مطالعه
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {['سارا', 'نیلوفر', 'مهسا'].map((name, index) => (
              <div
                className="flex items-center gap-2 rounded-xl border bg-muted/35 px-3 py-2"
                key={name}
              >
                <span className="relative grid size-9 place-items-center rounded-lg bg-secondary font-black text-secondary-foreground">
                  {name.slice(0, 1)}
                  <i
                    className={`absolute -bottom-1 -left-1 size-3 rounded-full border-2 border-card ${index === 2 ? 'bg-warning' : 'bg-success'}`}
                  />
                </span>
                <span>
                  <strong className="block text-sm">{name}</strong>
                  <small className="text-muted-foreground">
                    {index === 2 ? 'استراحت کوتاه' : 'در حال مطالعه'}
                  </small>
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <LiveStudy currentUserId={profile.id} />
      )}
    </div>
  )
}
