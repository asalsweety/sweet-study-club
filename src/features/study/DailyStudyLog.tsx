import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { useId, useRef, useState, type FormEvent } from 'react'
import { api } from '../../app/api'
import { auth } from '../../app/auth'
import { invalidateStudyData, queryKeys, useSession, useSubjects } from '../../app/session'
import { useOnlineStatus } from '../../app/pwa/online-status'
import { ApiClientError } from '../../shared/api/api-client-error'
import QueryError from '../../components/QueryError'
import { Button } from '../../components/ui/button'
import { DateInput } from '../../components/ui/date-input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import { errorMessage } from '../../shared/api/http'
import { manualStudyLogInputSchema, type CompletedStudyLog, type ManualStudyLogInput } from '../../shared/api/study-timer'
import { tehranClock } from '../../shared/lib/tehran'
import { manualStartMinute, recordLocal } from './offline-timer'
import { useTimerJournal, writeJournal } from './timer-journal'
import { confirmAction } from '../../shared/lib/confirm'
import { clockTime, formatDuration, jalaliFullDate } from '../../shared/lib/format'
import { cn } from '../../shared/lib/utils'

const modeLabels = { free: 'مطالعۀ آزاد', scheduled: 'پارت باشگاه', pomodoro: 'پومودورو' } as const

function wholeNumber(value: unknown) {
  const text = String(value ?? '').trim()
    .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 0x0660))
  return /^\d{0,2}$/.test(text) ? Number(text) : Number.NaN
}

function RecordStudy({ date, close }: { date: string; close: () => void }) {
  const client = useQueryClient()
  const userId = useSession().data?.user.id
  const online = useOnlineStatus()
  const subjects = useSubjects()
  const subjectListId = useId()
  const request = useRef<{ signature: string; input: ManualStudyLogInput } | null>(null)
  const [validation, setValidation] = useState('')
  const record = useMutation({
    mutationFn: async (input: ManualStudyLogInput) => {
      if (!userId) throw Error('برای ثبت گزارش وارد حسابت شو.')
      if (online && navigator.onLine) {
        try { return await api.timer.recordLog(input, userId) } catch (error) {
          if (!(error instanceof ApiClientError) || error.code !== 'NETWORK_ERROR') throw error
        }
      }
      if (userId !== auth.getOfflineAccountId()) throw new ApiClientError('برای ذخیرۀ گزارش یک بار وارد حسابت شو.', { code: 'OFFLINE_OWNER_MISSING' })
      return writeJournal(userId, journal => recordLocal(journal, input, Date.now()))
    },
    networkMode: 'always',
    onSuccess: (log) => {
      client.setQueryData<CompletedStudyLog[]>(queryKeys.studyLogs(date), (logs) =>
        logs && [...logs.filter(existing => existing.id !== log.id), log].sort((a, b) => b.startedAt.localeCompare(a.startedAt)))
      invalidateStudyData(client)
      close()
    },
  })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (record.isPending) return
    const form = new FormData(event.currentTarget)
    const hours = wholeNumber(form.get('hours'))
    const minutes = wholeNumber(form.get('minutes'))
    const durationMinutes = hours * 60 + minutes
    if (!Number.isInteger(durationMinutes) || hours < 0 || minutes < 0 || minutes > 59 || durationMinutes < 1 || durationMinutes > 1440) {
      setValidation('ساعت و دقیقه را جدا وارد کن. مدت مطالعه باید بین ۱ دقیقه و ۲۴ ساعت باشد.')
      return
    }
    const time = String(form.get('startTime') ?? '')
    const subjectName = String(form.get('subject') ?? '').trim()
    const title = String(form.get('title') ?? '').trim()
    const values = {
      subjectName, date, durationMinutes,
      ...(title && { title }),
      ...(time && { startMinute: Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5)) }),
    }
    const signature = JSON.stringify(values)
    if (request.current?.signature !== signature) {
      const parsed = manualStudyLogInputSchema.safeParse({ ...values, recordId: crypto.randomUUID() })
      if (!parsed.success) {
        setValidation('نام درس یا زمان واردشده را بررسی کن.')
        return
      }
      try {
        // Freeze the time before the first request; a lost reply may be retried on a different minute or day.
        request.current = { signature, input: { ...parsed.data, startMinute: manualStartMinute(parsed.data, Date.now()) } }
      } catch (error) {
        setValidation(errorMessage(error))
        return
      }
    }
    setValidation('')
    record.mutate(request.current.input)
  }

  return <Dialog open onOpenChange={(open) => { if (!open && !record.isPending) close() }}>
    <DialogContent dir="rtl" className="max-h-[90dvh] overflow-y-auto">
      <DialogHeader className="text-right">
        <DialogTitle>ثبت دستی مطالعه</DialogTitle>
        <DialogDescription>{jalaliFullDate(date)}</DialogDescription>
      </DialogHeader>
      <form className="grid gap-3" onSubmit={submit}>
        <fieldset disabled={record.isPending} className="grid gap-3">
          <label className="grid gap-1 text-sm font-semibold">نام درس
            <Input name="subject" list={subjectListId} maxLength={80} required autoComplete="off" />
            <datalist id={subjectListId}>{subjects.data?.map((subject) => <option key={subject.id} value={subject.name} />)}</datalist>
          </label>
          <label className="grid gap-1 text-sm font-semibold">عنوان جلسه (اختیاری)
            <Input name="title" maxLength={120} placeholder="مثلاً مرور فصل اول" />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1 text-sm font-semibold">ساعت
              <Input name="hours" inputMode="numeric" maxLength={2} placeholder="۰" />
            </label>
            <label className="grid gap-1 text-sm font-semibold">دقیقه
              <Input name="minutes" inputMode="numeric" maxLength={2} placeholder="۰" />
            </label>
          </div>
          <label className="grid gap-1 text-sm font-semibold">زمان شروع به وقت تهران (اختیاری)
            <Input name="startTime" type="time" dir="ltr" />
          </label>
          <p className="text-xs text-muted-foreground">با خالی گذاشتن ساعت شروع، مدت مطالعه تا زمان ثبت یا پایان روز محاسبه می‌شود.</p>
          <Button type="submit">{record.isPending ? 'در حال ثبت…' : 'ثبت مطالعه'}</Button>
        </fieldset>
        {(validation || record.isError) && <p className="text-sm text-destructive" role="alert">{validation || errorMessage(record.error)}</p>}
      </form>
    </DialogContent>
  </Dialog>
}

export default function DailyStudyLog({ today, browse = false, className }: { today: string; browse?: boolean; className?: string }) {
  const client = useQueryClient()
  const online = useOnlineStatus()
  const userId = useSession().data?.user.id
  const journal = useTimerJournal(userId).data
  const headingId = useId()
  const [selectedDate, setSelectedDate] = useState('')
  const [recordDate, setRecordDate] = useState<string | null>(null)
  const date = selectedDate || today
  const logs = useQuery({ queryKey: queryKeys.studyLogs(date), queryFn: () => api.timer.logs(date, date), networkMode: 'always' })
  const pending = journal?.finished.filter(item => tehranClock(Date.parse(item.log.startedAt)).date === date) ?? []
  const deleted = journal?.deletions.filter(item => item.date === date) ?? []
  const merged = new Map((logs.data ?? []).map(log => [log.id, log]))
  for (const entry of pending) merged.set(entry.log.id, entry.log)
  for (const job of deleted) if (!pending.some(entry => entry.log.id === job.id && entry.problem)) merged.delete(job.id)
  const daysLogs = [...merged.values()].sort((a, b) => b.startedAt.localeCompare(a.startedAt))
  const uncached = !logs.data && (!online || logs.error instanceof ApiClientError && logs.error.code === 'OFFLINE_NOT_CACHED')
  const remove = useMutation({
    mutationFn: async ({ id, day, discardConflict }: { id: string; day: string; discardConflict?: boolean }) => {
      if (!userId) throw Error('برای تغییر گزارش وارد حسابت شو.')
      if (discardConflict) {
        await writeJournal(userId, data => {
          data.finished = data.finished.filter(item => item.log.id !== id || !item.problem)
          data.deletions = data.deletions.filter(item => item.id !== id)
        })
        return
      }
      if (online && navigator.onLine && !pending.some(item => item.log.id === id)) {
        try { return await api.timer.removeLog(id, userId) } catch (error) {
          if (!(error instanceof ApiClientError) || error.code !== 'NETWORK_ERROR') throw error
        }
      }
      if (userId !== auth.getOfflineAccountId()) throw new ApiClientError('برای تغییر گزارش یک بار وارد حسابت شو.', { code: 'OFFLINE_OWNER_MISSING' })
      await writeJournal(userId, data => { if (!data.deletions.some(job => job.id === id)) data.deletions.push({ id, date: day }) })
    },
    networkMode: 'always',
    onSuccess: (_, { id, day, discardConflict }) => {
      if (!discardConflict) client.setQueryData<CompletedStudyLog[]>(queryKeys.studyLogs(day), (list) => list?.filter(log => log.id !== id))
      invalidateStudyData(client)
    },
  })
  const deleteLog = async (log: CompletedStudyLog) => {
    const conflict = pending.find(entry => entry.log.id === log.id)?.problem
    const confirmed = await confirmAction({
      title: conflict ? 'نسخۀ همگام‌نشده از این دستگاه حذف شود؟' : 'این جلسه حذف شود؟',
      description: conflict ? `نسخۀ محلی «${log.title ?? log.subjectName}» پاک می‌شود و می‌توانی گزارش حساب را دوباره ببینی.`
        : `«${log.title ?? log.subjectName}» و مدت آن از گزارش و مجموع مطالعه حذف می‌شود.`,
      confirmLabel: conflict ? 'حذف نسخۀ محلی' : 'حذف جلسه',
    })
    if (!confirmed) return
    remove.mutate({ id: log.id, day: date, discardConflict: Boolean(conflict) })
  }

  return <section aria-labelledby={headingId} className={cn('grid gap-3', className)}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h2 id={headingId} className="text-base font-bold">{browse ? 'گزارش جلسات مطالعه' : 'جلسه‌های مطالعۀ امروز'}</h2>
        <p className="text-sm text-muted-foreground">{jalaliFullDate(date)}{daysLogs.length ? ` · ${formatDuration(daysLogs.reduce((total, log) => total + log.durationSeconds, 0))}` : ''}</p>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={() => setRecordDate(date)}><Plus size={16} /> ثبت دستی</Button>
    </div>
    {browse && <label className="grid w-full max-w-56 gap-1 text-sm font-semibold">روز گزارش
      <DateInput value={date} max={today} onChange={(event) => setSelectedDate(event.target.value)} />
    </label>}
    {uncached && <p role="status" className="text-sm text-muted-foreground">گزارش حساب برای این روز روی دستگاه ذخیره نشده است.</p>}
    {deleted.length > 0 && <p role="status" className="text-sm text-muted-foreground">حذف جلسه در انتظار همگام‌سازی است.</p>}
    {logs.isError && !uncached && <QueryError error={logs.error} retry={() => void logs.refetch()} />}
    {remove.isError && <QueryError error={remove.error} />}
    {!daysLogs.length && logs.isPending && !uncached ? <p role="status" className="text-sm text-muted-foreground">
      {logs.fetchStatus === 'paused' ? 'برای دریافت گزارش به اینترنت وصل شو.' : 'در حال دریافت گزارش…'}
    </p>
      : !uncached && logs.data && daysLogs.length === 0 ? <p className="text-sm text-muted-foreground">جلسه‌ای برای این روز ثبت نشده است.</p>
      : daysLogs.length > 0 && <ul className="grid gap-2">
        {daysLogs.map((log) => <li key={log.id} className="flex items-start justify-between gap-2 rounded-xl border border-border/70 p-3">
          <div className="min-w-0 break-words">
            <h3 className="text-sm font-bold">{log.title ?? log.subjectName}</h3>
            <p className="mt-0.5 text-xs leading-6 text-muted-foreground">
              {log.title && log.title !== log.subjectName && `${log.subjectName} · `}
              {log.recordedManually ? 'ثبت دستی' : modeLabels[log.mode]} · <bdi>{clockTime(log.startedAt)} – {clockTime(log.endedAt)}</bdi>
            </p>
            {log.note && <p className="mt-1 text-xs leading-6 text-muted-foreground">{log.note}</p>}
            {pending.some(item => item.log.id === log.id) && <p className="text-xs leading-6 text-muted-foreground">
              {pending.find(item => item.log.id === log.id)?.problem ?? 'روی دستگاه ذخیره شده · در انتظار همگام‌سازی'}
            </p>}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <span className="text-xs font-bold text-primary">{formatDuration(log.durationSeconds)}</span>
            <Button type="button" variant="ghost" size="icon" aria-label={`حذف ${log.title ?? log.subjectName}`} disabled={remove.isPending} onClick={() => void deleteLog(log)}>
              <Trash2 size={16} />
            </Button>
          </div>
        </li>)}
      </ul>}
    {recordDate && <RecordStudy key={recordDate} date={recordDate} close={() => setRecordDate(null)} />}
  </section>
}
