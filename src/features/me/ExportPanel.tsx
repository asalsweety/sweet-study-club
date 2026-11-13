import { useQuery } from '@tanstack/react-query'
import { Download, FileText, ImageDown, LoaderCircle } from 'lucide-react'
import { useRef, useState } from 'react'
import { api } from '../../app/api'
import { queryKeys } from '../../app/session'
import type { UserProfile } from '../../shared/api/profile'
import { escapeCsvValue } from '../../shared/lib/csv'
import { fa, formatDuration, formatHours, jalaliDay } from '../../shared/lib/format'
import { addDays, tehranClock } from '../../shared/lib/tehran'
import { Button } from '../../components/ui/button'

function download(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const link = Object.assign(document.createElement('a'), { href: url, download: name })
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function ExportPanel({ profile }: { profile: UserProfile }) {
  const card = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState<'csv' | 'png' | null>(null)
  const week = useQuery({ queryKey: queryKeys.progress('week'), queryFn: () => api.progress.period('week') }).data
  const level = useQuery({ queryKey: queryKeys.gamification, queryFn: api.progress.gamification }).data?.level

  const exportCsv = async () => {
    setBusy('csv')
    try {
      const today = tehranClock(Date.now()).date
      // The API caps each request at 62 days; walk back a year in windows.
      const windows = Array.from({ length: 6 }, (_, index) => [addDays(today, -(index + 1) * 61 + 1), addDays(today, -index * 61)] as const)
      const logs = (await Promise.all(windows.map(([from, to]) => api.timer.logs(from, to)))).flat()
      const header = ['تاریخ', 'درس', 'حالت', 'دقیقه', 'تست', 'درست', 'غلط', 'تمرکز', 'یادداشت']
      const rows = logs.map((log) => [
        tehranClock(Date.parse(log.startedAt)).date,
        log.subjectName,
        ({ free: 'آزاد', pomodoro: 'پومودورو', scheduled: 'پارت برنامه' } as Record<string, string>)[log.mode] ?? log.mode,
        Math.round(log.durationSeconds / 60),
        log.testCount,
        log.testsCorrect,
        log.testsWrong,
        log.focusRating,
        log.note,
      ])
      const csv = [header, ...rows].map((row) => row.map((cell) => escapeCsvValue(cell ?? null)).join(',')).join('\r\n')
      download('sweet-study-sessions.csv', new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }))
    } finally {
      setBusy(null)
    }
  }

  const exportPng = async () => {
    if (!card.current) return
    setBusy('png')
    try {
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(card.current, { backgroundColor: null, scale: 2 })
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
      if (!blob) return
      const file = new File([blob], 'sweet-study-week.png', { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: 'Sweet Study Club' })
      else download(file.name, blob)
    } catch {
      // Share sheet dismissed: nothing to do.
    } finally {
      setBusy(null)
    }
  }

  return (
    <section id="export" className="glass rise flex flex-col gap-4 rounded-2xl p-5 sm:p-6">
      <h2 className="flex items-center gap-2 text-lg font-bold"><Download size={19} className="text-primary" /> خروجی و کارت اشتراک</h2>

      <div ref={card} dir="rtl" className="overflow-hidden rounded-3xl bg-primary p-6 text-primary-foreground">
        <p className="text-sm opacity-80">Sweet Study Club · هفته‌ی من</p>
        <p className="mt-1 text-2xl font-bold">{profile.displayName}</p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-white/15 p-2"><p className="text-lg font-bold">{week ? formatHours(week.current.totalSeconds) : '—'}</p><p className="text-[10px] opacity-80">ساعت</p></div>
          <div className="rounded-2xl bg-white/15 p-2"><p className="text-lg font-bold">{fa(week?.streak.current ?? 0)}</p><p className="text-[10px] opacity-80">روز پیاپی</p></div>
          <div className="rounded-2xl bg-white/15 p-2"><p className="text-lg font-bold">{fa(level?.level ?? 1)}</p><p className="text-[10px] opacity-80">سطح</p></div>
        </div>
        <p className="mt-3 text-xs opacity-80">
          {week ? `${jalaliDay(week.current.from)} تا ${jalaliDay(week.current.to)} · درس محبوب: ${week.current.favoriteSubject ?? '—'}` : ''}
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <Button variant="secondary" onClick={() => void exportPng()} disabled={busy !== null} className="rounded-2xl font-bold">
          {busy === 'png' ? <LoaderCircle className="animate-spin" /> : <ImageDown />} کارت PNG
        </Button>
        <Button variant="secondary" onClick={() => void exportCsv()} disabled={busy !== null} className="rounded-2xl font-bold">
          {busy === 'csv' ? <LoaderCircle className="animate-spin" /> : <Download />} CSV (اکسل)
        </Button>
        <Button variant="secondary" onClick={() => window.print()} className="rounded-2xl font-bold">
          <FileText /> گزارش PDF
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        گزارش PDF از چاپ مرورگر ساخته می‌شود («ذخیره به‌صورت PDF»). {week && `این هفته: ${formatDuration(week.current.totalSeconds)}.`}
      </p>
    </section>
  )
}
