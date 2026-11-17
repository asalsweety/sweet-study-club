import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, BookOpen, CalendarDays, Check, LoaderCircle, Sparkles, Timer, UsersRound } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../app/api'
import { queryKeys } from '../../app/session'
import { Button } from '../../components/ui/button'
import { DateInput } from '../../components/ui/date-input'
import { errorMessage } from '../../shared/api/http'
import type { EducationGroupId, UserSettings } from '../../shared/api/settings'
import { celebrate } from '../../shared/lib/confetti'
import { educationGroups, examForProfile, findGroup, profileLabel, studyGoals, type StudyGoal } from '../../shared/lib/education'
import { daysUntil, fa, jalaliFullDate } from '../../shared/lib/format'
import { cn } from '../../shared/lib/utils'
import HelperCharacter from '../helper/HelperCharacter'
// The sprite-sheet framing lives with the helper; onboarding renders outside the app shell that normally loads it.
import '../helper/study-helper.css'

const intro = [
  { icon: Timer, title: 'تمرکز، با ریتم خودت', body: 'یک جلسه شروع کن تا عسل کنارت در اتاق پیکسلی‌اش درس بخواند. مطالعۀ آزاد، پومودورو یا پارت‌های روزانۀ باشگاه.' },
  { icon: CalendarDays, title: 'یک روز قابل انجام', body: 'کارهای امروز و هفته را بچین، یادآور بگذار و ببین هر روز چقدر جلو رفتی.' },
  { icon: BookOpen, title: 'یادگیری مخصوص رشتۀ تو', body: 'بانک سؤال، آزمون، مرور و دستیار هوشمند؛ همه بر اساس مسیری که الان انتخاب می‌کنی.' },
  { icon: UsersRound, title: 'کنار هم، بهتر', body: 'دوستانت را اضافه کن، ببین چه کسی همین الان درس می‌خواند و تشویقش کن.' },
]

const dailyGoals = [60, 120, 180, 240, 300, 360]

/**
 * First-run welcome: explains the app, then asks who the learner is so
 * subjects, the exam countdown, learning tracks and AI help fit them. Also
 * reachable from settings to change the education profile later.
 */
export default function OnboardingFlow({ settings, editing = false }: { settings: UserSettings; editing?: boolean }) {
  const client = useQueryClient()
  const navigate = useNavigate()
  const [step, setStep] = useState(editing ? 1 : 0)
  const [group, setGroup] = useState<EducationGroupId | null>(settings.educationGroup)
  const [stage, setStage] = useState<string | null>(settings.educationStage)
  const [goals, setGoals] = useState<StudyGoal[]>(settings.studyGoals.length ? settings.studyGoals : ['exam', 'habit'])
  const [examDate, setExamDate] = useState(settings.konkurDate ?? '')
  const [dailyGoal, setDailyGoal] = useState(settings.dailyGoalMinutes || 240)
  const [replaceSubjects, setReplaceSubjects] = useState(!editing || settings.educationGroup !== group)
  const picked = findGroup(group)
  const exam = examForProfile(group, stage)
  const needsStage = (picked?.stages.length ?? 0) > 1

  const save = useMutation({
    mutationFn: async () => {
      if (!group) throw new Error('missing group')
      const resolvedStage = stage ?? picked?.stages[0]?.id ?? 'general'
      const next = await api.settings.update({
        educationGroup: group,
        educationStage: resolvedStage,
        studyGoals: goals,
        dailyGoalMinutes: dailyGoal,
        konkurDate: exam && /^\d{4}-\d{2}-\d{2}$/.test(examDate) ? examDate : null,
      })
      client.setQueryData(queryKeys.settings, next)
      if (replaceSubjects) client.setQueryData(queryKeys.subjects, await api.subjects.resetForProfile())
      return next
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['progress'] })
      celebrate({ particles: 120, origin: { x: 0.5, y: 0.3 } })
      if (editing) navigate('/me?section=settings', { replace: true })
      else navigate('/', { replace: true })
    },
  })

  const steps = needsStage ? 4 : 3
  const position = step === 0 ? 0 : step === 1 ? 1 : step === 2 && needsStage ? 2 : steps
  const next = () => setStep((current) => (current === 1 && !needsStage ? 3 : current + 1))
  const back = () => setStep((current) => (current === 3 && !needsStage ? 1 : Math.max(editing ? 1 : 0, current - 1)))

  return (
    <main dir="rtl" className="onboarding">
      <div className="onboarding-card">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex gap-1.5" aria-hidden>{Array.from({ length: steps + 1 }, (_, index) => <span key={index} className={cn('h-1.5 rounded-full transition-all duration-500', index <= position ? 'w-7 bg-primary' : 'w-3 bg-muted')} />)}</div>
          {step > (editing ? 1 : 0) && <button type="button" onClick={back} className="flex min-h-11 items-center gap-1 rounded-xl px-3 text-sm text-muted-foreground transition-colors hover:bg-muted"><ArrowRight size={16} />قبلی</button>}
        </div>

        {step === 0 && <section key="intro" className="stagger grid gap-6">
          <div className="flex items-center gap-4">
            <span className="grid size-24 shrink-0 place-items-center rounded-3xl bg-secondary"><HelperCharacter className="size-24" play /></span>
            <div><p className="eyebrow">به باشگاه مطالعه خوش آمدی</p><h1 className="mt-1 text-3xl">سلام! من عسلم 👋</h1><p className="mt-1 text-sm leading-7 text-muted-foreground">قبل از شروع، بگذار نشانت بدهم اینجا چطور کار می‌کند.</p></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">{intro.map(({ icon: Icon, title, body }) => <div key={title} className="flex gap-3 rounded-2xl border border-border bg-card/70 p-4"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[var(--glow-primary)]"><Icon size={19} /></span><div><p className="text-sm font-bold">{title}</p><p className="mt-1 text-xs leading-6 text-muted-foreground">{body}</p></div></div>)}</div>
          <Button size="lg" className="h-13 rounded-2xl text-base" onClick={next}>بزن بریم<ArrowLeft /></Button>
        </section>}

        {step === 1 && <section key="group" className="grid gap-5">
          <div><h1 className="text-2xl sm:text-3xl">{editing ? 'مسیر تحصیلی‌ات' : 'تو کدام یکی هستی؟'}</h1><p className="mt-2 text-sm leading-7 text-muted-foreground">درس‌ها، آزمون‌ها و کمک‌های هوش مصنوعی را بر اساس همین می‌چینیم.</p></div>
          <div className="stagger grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="گروه تحصیلی">
            {educationGroups.map((item) => <button key={item.id} type="button" role="radio" aria-checked={group === item.id} onClick={() => { setGroup(item.id); setStage(item.stages.length === 1 ? item.stages[0]!.id : null); if (editing && item.id !== settings.educationGroup) setReplaceSubjects(true) }} className={cn('onboarding-choice', group === item.id && 'is-selected')}>
              <span className="text-2xl" aria-hidden>{item.emoji}</span>
              <span className="min-w-0 flex-1 text-right"><span className="block text-sm font-bold">{item.label}</span><span className="mt-0.5 block text-xs text-muted-foreground">{item.hint}</span></span>
              {group === item.id && <Check size={18} className="shrink-0 text-primary" />}
            </button>)}
          </div>
          <Button size="lg" className="h-13 rounded-2xl text-base" disabled={!group} onClick={next}>ادامه<ArrowLeft /></Button>
        </section>}

        {step === 2 && picked && needsStage && <section key="stage" className="grid gap-5">
          <div><p className="eyebrow">{picked.emoji} {picked.label}</p><h1 className="mt-1 text-2xl sm:text-3xl">{picked.stageQuestion}</h1></div>
          <div className="stagger grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label={picked.stageQuestion}>
            {picked.stages.map((item) => <button key={item.id} type="button" role="radio" aria-checked={stage === item.id} onClick={() => setStage(item.id)} className={cn('onboarding-choice', stage === item.id && 'is-selected')}>
              <span className="min-w-0 flex-1 text-right"><span className="block text-sm font-bold">{item.label}</span><span className="mt-0.5 block text-xs text-muted-foreground">{item.hint ?? item.exam ?? ''}</span></span>
              {stage === item.id && <Check size={18} className="shrink-0 text-primary" />}
            </button>)}
          </div>
          <Button size="lg" className="h-13 rounded-2xl text-base" disabled={!stage} onClick={next}>ادامه<ArrowLeft /></Button>
        </section>}

        {step === 3 && <section key="goals" className="grid gap-6">
          <div><p className="eyebrow">{profileLabel(group, stage)}</p><h1 className="mt-1 text-2xl sm:text-3xl">برای چه آمده‌ای؟</h1><p className="mt-2 text-sm leading-7 text-muted-foreground">هرچند تا که می‌خواهی انتخاب کن؛ دستیار هوشمند با همین بهتر کمکت می‌کند.</p></div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="هدف‌های تو">{studyGoals.map(([id, label]) => { const on = goals.includes(id); return <button key={id} type="button" aria-pressed={on} onClick={() => setGoals(on ? goals.filter((g) => g !== id) : [...goals, id])} className={cn('rounded-full border px-4 py-2 text-sm font-bold transition-all active:scale-95', on ? 'border-primary bg-primary text-primary-foreground shadow-[var(--glow-primary)]' : 'border-border bg-card hover:border-primary/40')}>{label}</button> })}</div>
          {exam && <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2">
            <label htmlFor="onboarding-exam-date" className="text-sm font-bold">تاریخ {exam} <span className="font-normal text-muted-foreground">(اختیاری)</span></label>
            <DateInput id="onboarding-exam-date" value={examDate} aria-describedby="onboarding-exam-date-hint" onChange={(e) => setExamDate(e.target.value)} />
            <p id="onboarding-exam-date-hint" className="text-xs text-muted-foreground" aria-live="polite">{examDate && /^\d{4}-\d{2}-\d{2}$/.test(examDate) ? `${jalaliFullDate(examDate)} · ${daysUntil(examDate) > 0 ? `${fa(daysUntil(examDate))} روز مانده` : 'این تاریخ گذشته است'}` : 'اگر تاریخ را بدانی، شمارش معکوس روی صفحۀ امروز نشان داده می‌شود.'}</p>
          </div>}
          <div className="grid gap-2"><span className="text-sm font-bold">هدف مطالعۀ روزانه</span><div className="flex flex-wrap gap-2" role="radiogroup" aria-label="هدف روزانه">{dailyGoals.map((minutes) => <button key={minutes} type="button" role="radio" aria-checked={dailyGoal === minutes} onClick={() => setDailyGoal(minutes)} className={cn('rounded-xl border px-3.5 py-2 text-sm font-bold transition-all active:scale-95', dailyGoal === minutes ? 'border-primary bg-secondary text-primary' : 'border-border bg-card')}>{fa(minutes / 60)} ساعت</button>)}</div></div>
          <label className="flex items-start gap-3 rounded-2xl bg-muted/60 p-3.5 text-sm"><input type="checkbox" className="mt-1 size-4 accent-[var(--primary)]" checked={replaceSubjects} onChange={(e) => setReplaceSubjects(e.target.checked)} /><span><span className="font-bold">درس‌هایم را برای این مسیر بچین</span><span className="mt-0.5 block text-xs text-muted-foreground">درس‌های پیشنهادی رشته‌ات جایگزین فهرست فعلی می‌شوند؛ سابقۀ مطالعه‌ات دست‌نخورده می‌ماند.</span></span></label>
          {save.isError && <p role="alert" className="rounded-xl bg-[var(--destructive-soft)] p-3 text-sm text-[var(--destructive-text)]">{errorMessage(save.error)}</p>}
          <Button size="lg" className="h-13 rounded-2xl text-base" disabled={save.isPending || !group} onClick={() => save.mutate()}>{save.isPending ? <LoaderCircle className="animate-spin" /> : <Sparkles />}{editing ? 'ذخیرۀ مسیر' : 'شروع کنیم'}</Button>
        </section>}
      </div>
    </main>
  )
}
