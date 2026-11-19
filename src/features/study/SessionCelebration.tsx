import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Clock3, Target, Trophy } from 'lucide-react'
import { useEffect } from 'react'
import { api } from '../../app/api'
import { queryKeys } from '../../app/session'
import AnimatedNumber from '../../components/AnimatedNumber'
import AsalMood from '../../components/AsalMood'
import StudySticker from '../../components/StudySticker'
import { Button } from '../../components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../components/ui/dialog'
import { celebrate, haptic } from '../../shared/lib/confetti'
import { fa } from '../../shared/lib/format'
import { closeSessionCelebration, useSessionCelebration } from './sessionCelebrationStore'

const cheers = ['آفرین! یک قدم محکم دیگر.', 'عالی بود! ذهنت ازت ممنونه.', 'همین‌طور ادامه بده، داری می‌سازی.', 'یک جلسۀ دیگر، یک عادت قوی‌تر.']

export default function SessionCelebration() {
  const session = useSessionCelebration()
  const progress = useQuery({ queryKey: queryKeys.progress('day'), queryFn: () => api.progress.period('day'), enabled: Boolean(session) })
  const minutes = session ? Math.max(1, Math.round(session.durationSeconds / 60)) : 0
  const todayMinutes = Math.floor((progress.data?.today.seconds ?? 0) / 60)
  const goal = progress.data?.today.goalMinutes ?? 0
  const goalShare = goal > 0 ? Math.min(1, todayMinutes / goal) : 0

  useEffect(() => {
    if (!session) return
    haptic([18, 60, 18])
    const timeout = window.setTimeout(() => celebrate({ particles: 160, origin: { x: 0.5, y: 0.4 } }), 180)
    return () => window.clearTimeout(timeout)
  }, [session])

  return (
    <Dialog open={Boolean(session)} onOpenChange={(open) => { if (!open) closeSessionCelebration() }}>
      <DialogContent dir="rtl" className="overflow-hidden text-center sm:max-w-md">
        <div aria-hidden className="orb -top-24 left-1/2 size-56 -translate-x-1/2 bg-primary/30" />
        <div className="relative mx-auto mt-2 grid size-28 place-items-center">
          <svg aria-hidden viewBox="0 0 112 112" className="celebrate-ring absolute inset-0 text-primary/40"><circle cx="56" cy="56" r="52" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="2 9" strokeLinecap="round" /></svg>
          <span className="celebrate-badge grid size-20 place-items-center rounded-[1.8rem] bg-primary text-primary-foreground shadow-[var(--glow-primary)]"><Trophy size={38} strokeWidth={1.8} /></span>
          <StudySticker kind="bee" className="pointer-events-none absolute -end-5 bottom-0 size-14" />
        </div>
        <DialogTitle className="mt-2 text-2xl font-extrabold">{session ? cheers[session.durationSeconds % cheers.length] : ''}</DialogTitle>
        <DialogDescription className="-mt-1">{session?.subjectName} ثبت شد{session?.rating ? <> · تمرکز <AsalMood rating={session.rating} className="inline-block w-7 align-middle" /></> : ''}</DialogDescription>

        <div className="stagger grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-secondary/70 p-4">
            <Clock3 size={17} className="mx-auto mb-2 text-primary" />
            <p className="text-3xl font-extrabold"><AnimatedNumber value={minutes} /></p>
            <p className="mt-1 text-xs text-muted-foreground">دقیقه تمرکز</p>
          </div>
          <div className="rounded-2xl bg-secondary/70 p-4">
            <Target size={17} className="mx-auto mb-2 text-primary" />
            <p className="text-3xl font-extrabold">{session?.percent === null || !session ? <AnimatedNumber value={session?.tests ?? 0} /> : <><AnimatedNumber value={session.percent} />٪</>}</p>
            <p className="mt-1 text-xs text-muted-foreground">{session?.percent === null ? 'تست زده‌شده' : 'درصد تست‌ها'}</p>
          </div>
        </div>

        {goal > 0 && <div className="text-right">
          <div className="mb-2 flex items-center justify-between text-xs"><span className="font-bold">هدف امروز</span><span className="text-muted-foreground">{fa(todayMinutes)} از {fa(goal)} دقیقه</span></div>
          <div className="h-2.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-[linear-gradient(90deg,var(--primary),var(--chart-4))] transition-[width] duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)]" style={{ width: `${progress.data ? goalShare * 100 : 0}%` }} /></div>
          {goalShare >= 1 && <p className="mt-2 text-xs font-bold text-primary">🎉 هدف امروزت کامل شد!</p>}
        </div>}

        <Button size="lg" className="h-12 rounded-2xl text-base" onClick={closeSessionCelebration}>ادامه<ArrowLeft /></Button>
      </DialogContent>
    </Dialog>
  )
}
