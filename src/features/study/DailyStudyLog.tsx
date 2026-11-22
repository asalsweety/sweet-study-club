import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { useId, useRef, useState, type FormEvent } from 'react'
import { api } from '../../app/api'
import { invalidateStudyData, queryKeys, useSubjects } from '../../app/session'
import QueryError from '../../components/QueryError'
import { Button } from '../../components/ui/button'
import { DateInput } from '../../components/ui/date-input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import { errorMessage } from '../../shared/api/http'
import { manualStudyLogInputSchema, type CompletedStudyLog } from '../../shared/api/study-timer'
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
  const subjects = useSubjects()
  const subjectListId = useId()
  const request = useRef<{ signature: string; id: string } | null>(null)
  const [validation, setValidation] = useState('')
  const record = useMutation({
    mutationFn: api.timer.recordLog,
    networkMode: 'always',
    onSuccess: (log) => {
      client.setQueryData<CompletedStudyLog[]>(queryKeys.studyLogs(date), (logs) =>
        [...(logs ?? []).filter(existing => existing.id !== log.id), log].sort((a, b) => b.startedAt.localeCompare(a.startedAt)))
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
    if (request.current?.signature !== signature) request.current = { id: crypto.randomUUID(), signature }
    const parsed = manualStudyLogInputSchema.safeParse({ ...values, recordId: request.current.id })
    if (!parsed.success) {
      setValidation('نام درس یا زمان واردشده را بررسی کن.')
      return
    }
    setValidation('')
    record.mutate(parsed.data)
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
  const headingId = useId()
  const [selectedDate, setSelectedDate] = useState('')
  const [recordDate, setRecordDate] = useState<string | null>(null)
  const date = selectedDate || today
  const logs = useQuery({ queryKey: queryKeys.studyLogs(date), queryFn: () => api.timer.logs(date, date) })
  const remove = useMutation({
    mutationFn: ({ id }: { id: string; day: string }) => api.timer.removeLog(id),
    networkMode: 'always',
    onSuccess: (_, { id, day }) => {
      client.setQueryData<CompletedStudyLog[]>(queryKeys.studyLogs(day), (list) => list?.filter(log => log.id !== id))
      invalidateStudyData(client)
    },
  })
  const deleteLog = async (log: CompletedStudyLog) => {
    const confirmed = await confirmAction({
      title: 'این جلسه حذف شود؟',
      description: `«${log.title ?? log.subjectName}» و مدت آن از گزارش و مجموع مطالعه حذف می‌شود.`,
      confirmLabel: 'حذف جلسه',
    })
    if (confirmed) remove.mutate({ id: log.id, day: date })
  }

  return <section aria-labelledby={headingId} className={cn('grid gap-3', className)}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h2 id={headingId} className="text-base font-bold">{browse ? 'گزارش جلسات مطالعه' : 'جلسه‌های مطالعۀ امروز'}</h2>
        <p className="text-sm text-muted-foreground">{jalaliFullDate(date)}{logs.data?.length ? ` · ${formatDuration(logs.data.reduce((total, log) => total + log.durationSeconds, 0))}` : ''}</p>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={() => setRecordDate(date)}><Plus size={16} /> ثبت دستی</Button>
    </div>
    {browse && <label className="grid w-full max-w-56 gap-1 text-sm font-semibold">روز گزارش
      <DateInput value={date} max={today} onChange={(event) => setSelectedDate(event.target.value)} />
    </label>}
    {logs.isError && <QueryError error={logs.error} retry={() => void logs.refetch()} />}
    {remove.isError && <QueryError error={remove.error} />}
    {logs.isPending ? <p role="status" className="text-sm text-muted-foreground">
      {logs.fetchStatus === 'paused' ? 'برای دریافت گزارش به اینترنت وصل شو.' : 'در حال دریافت گزارش…'}
    </p>
      : logs.data?.length === 0 ? <p className="text-sm text-muted-foreground">جلسه‌ای برای این روز ثبت نشده است.</p>
      : logs.data && <ul className="grid gap-2">
        {logs.data.map((log) => <li key={log.id} className="flex items-start justify-between gap-2 rounded-xl border border-border/70 p-3">
          <div className="min-w-0 break-words">
            <h3 className="text-sm font-bold">{log.title ?? log.subjectName}</h3>
            <p className="mt-0.5 text-xs leading-6 text-muted-foreground">
              {log.title && log.title !== log.subjectName && `${log.subjectName} · `}
              {log.recordedManually ? 'ثبت دستی' : modeLabels[log.mode]} · <bdi>{clockTime(log.startedAt)} – {clockTime(log.endedAt)}</bdi>
            </p>
            {log.note && <p className="mt-1 text-xs leading-6 text-muted-foreground">{log.note}</p>}
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
