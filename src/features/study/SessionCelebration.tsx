import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Clock3, Sparkles, Target, Trophy } from 'lucide-react'
import { useEffect } from 'react'
import { api } from '../../app/api'
import { queryKeys } from '../../app/session'
import AnimatedNumber from '../../components/AnimatedNumber'
import AsalMood from '../../components/AsalMood'
import { moodLabels } from '../../shared/lib/moods'
import './session-panels.css'
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
      <DialogContent dir="rtl" className="session-panel celebration-panel">
        <div className="celebration-emblem">
          <span className="celebration-avatar"><AsalMood rating={session?.rating ?? 5} label={false} /></span>
          <span className="celebration-cup"><Trophy size={28} /></span>
        </div>
        <DialogTitle>{session && cheers[session.durationSeconds % cheers.length]}</DialogTitle>
        <DialogDescription>جلسۀ {session?.subjectName} ثبت شد{session?.rating ? ` · حس‌وحال: ${moodLabels[session.rating - 1]}` : ''}</DialogDescription>
        <div className="celebration-stats">
          <div><Target /><strong>{session?.percent != null ? <><AnimatedNumber value={session.percent} />٪</> : '—'}</strong><span>درصد تست‌ها</span></div>
          <div><CheckCircle2 /><strong><AnimatedNumber value={session?.tests ?? 0} /></strong><span>تست زده‌شده</span></div>
          <div><Clock3 /><strong><AnimatedNumber value={minutes} /></strong><span>دقیقه تمرکز</span></div>
        </div>
        <div className="celebration-goal">{goal > 0 && <><span>{goalShare >= 1 ? 'هدف امروزت کامل شد!' : 'هدف امروز'} {fa(todayMinutes)} از {fa(goal)} دقیقه</span>
          <progress className="mx-auto mt-2 block h-1 w-1/2 accent-primary" aria-label="پیشرفت هدف روزانه" value={goalShare} max={1} /></>}</div>
        <img className="celebration-bee" src="/images/figma/modal-flower-bee.webp" alt="" width="92" height="92" />
        <Button onClick={closeSessionCelebration}><Sparkles />ادامه</Button>
      </DialogContent>
    </Dialog>
  )
}
