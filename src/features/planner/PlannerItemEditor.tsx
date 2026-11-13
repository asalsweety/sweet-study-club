import { useState } from 'react'
import { useSubjects } from '../../app/session'
import type { PlannerItem } from '../../shared/api/planner'
import { cn } from '../../shared/lib/utils'
import { Button } from '../../components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'

export type PlannerDraft = {
  kind: 'task' | 'note'
  title: string
  details: string | null
  subjectName: string | null
  plannedMinutes: number | null
  plannedTests: number | null
  remindAt: string | null
}

type Props = {
  open: boolean
  date: string
  item: PlannerItem | null
  saving: boolean
  onClose: () => void
  onSave: (draft: PlannerDraft) => void
}

const toLocalInput = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16) : '')

export default function PlannerItemEditor({ open, date, item, saving, onClose, onSave }: Props) {
  const subjects = useSubjects()
  const [kind, setKind] = useState<'task' | 'note'>(item?.kind ?? 'task')
  const [title, setTitle] = useState(item?.title ?? '')
  const [details, setDetails] = useState(item?.details ?? '')
  const [subject, setSubject] = useState(item?.subjectName ?? '')
  const [minutes, setMinutes] = useState(item?.plannedMinutes ? String(item.plannedMinutes) : '')
  const [tests, setTests] = useState(item?.plannedTests ? String(item.plannedTests) : '')
  const [remind, setRemind] = useState(toLocalInput(item?.remindAt ?? null))

  const number = (value: string) => (value.trim() === '' ? null : Math.max(1, Number(value)))

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent dir="rtl" className="max-h-[92dvh] overflow-y-auto rounded-2xl sm:max-w-lg">
        <DialogHeader className="text-right">
          <DialogTitle className="text-xl font-bold">{item ? 'ویرایش' : 'افزودن به پلنر'}</DialogTitle>
          <DialogDescription>عنوان، هدف و زمان یادآوری را برای این روز مشخص کن.</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            onSave({
              kind,
              title: title.trim(),
              details: details.trim() || null,
              subjectName: subject || null,
              plannedMinutes: kind === 'task' ? number(minutes) : null,
              plannedTests: kind === 'task' ? number(tests) : null,
              remindAt: remind ? new Date(remind).toISOString() : null,
            })
          }}
        >
          <div className="grid grid-cols-2 rounded-2xl bg-muted/70 p-1 text-sm font-bold">
            {(['task', 'note'] as const).map((value) => (
              <button key={value} type="button" onClick={() => setKind(value)} className={cn('rounded-xl py-2', kind === value ? 'bg-card shadow-sm' : 'text-muted-foreground')}>
                {value === 'task' ? '✅ کار' : '📝 یادداشت'}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="planner-title">عنوان</Label>
            <Input id="planner-title" required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={kind === 'task' ? 'مثلاً فصل ۳ زیست + ۴۰ تست' : 'یادداشت امروز'} />
          </div>
          {kind === 'task' && (
            <>
              <div className="flex flex-wrap gap-2">
                {(subjects.data ?? []).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSubject(subject === item.name ? '' : item.name)}
                    className={cn('rounded-full border px-3 py-1 text-xs font-bold', subject === item.name ? 'text-white' : 'border-border')}
                    style={subject === item.name ? { background: item.color, borderColor: item.color } : undefined}
                  >
                    {item.emoji} {item.name}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="planner-minutes">دقیقه‌ی هدف</Label>
                  <Input id="planner-minutes" type="number" min={1} max={1440} value={minutes} onChange={(e) => setMinutes(e.target.value)} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="planner-tests">تست هدف</Label>
                  <Input id="planner-tests" type="number" min={1} max={10000} value={tests} onChange={(e) => setTests(e.target.value)} />
                </div>
              </div>
            </>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="planner-details">جزئیات</Label>
            <Textarea id="planner-details" rows={3} maxLength={2000} value={details} onChange={(e) => setDetails(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="planner-remind">یادآوری (اختیاری)</Label>
            <Input id="planner-remind" type="datetime-local" dir="ltr" value={remind} onChange={(e) => setRemind(e.target.value)} min={`${date}T00:00`} />
          </div>
          <Button type="submit" size="lg" disabled={saving || !title.trim()} className="h-12 rounded-2xl bg-primary font-bold">
            {item ? 'ذخیره' : 'افزودن'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
