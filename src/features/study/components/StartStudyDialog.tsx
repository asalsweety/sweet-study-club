import type { FormEvent } from 'react'
import { Focus, Play, RotateCcw } from 'lucide-react'
import { studySubjects } from '../../../entities/study/model'
import { Button } from '../../../components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Switch } from '../../../components/ui/switch'
import { cn } from '../../../shared/lib/utils'

type StartStudyDialogProps = {
  selectedSubject: string
  customSubject: string
  focusLockEnabled: boolean
  scheduledSessionAvailable: boolean
  working: boolean
  onClose: () => void
  onSelectSubject: (subject: string) => void
  onCustomSubjectChange: (subject: string) => void
  onFocusLockChange: (enabled: boolean) => void
  onStartFreeStudy: (event: FormEvent<HTMLFormElement>) => void
  onStartScheduledStudy: () => void
}

export default function StartStudyDialog({
  selectedSubject,
  customSubject,
  focusLockEnabled,
  scheduledSessionAvailable,
  working,
  onClose,
  onSelectSubject,
  onCustomSubjectChange,
  onFocusLockChange,
  onStartFreeStudy,
  onStartScheduledStudy,
}: StartStudyDialogProps) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl" dir="rtl">
        <form onSubmit={onStartFreeStudy}>
          <DialogHeader>
            <DialogTitle>شروع یک مطالعه جدید</DialogTitle>
            <DialogDescription>
              موضوع مطالعه را انتخاب کن. بعداً می‌توانی زمان ثبت‌شده را در بخش پیشرفت ببینی.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-6">
            <fieldset className="grid gap-3">
              <legend className="mb-1 text-sm font-bold">موضوع مطالعه</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {studySubjects.map((subject) => {
                  const selected =
                    selectedSubject === subject && !customSubject.trim()

                  return (
                    <Button
                      type="button"
                      key={subject}
                      variant={selected ? 'default' : 'outline'}
                      className={cn('justify-start', selected && 'shadow-sm')}
                      aria-pressed={selected}
                      onClick={() => onSelectSubject(subject)}
                    >
                      {subject}
                    </Button>
                  )
                })}
              </div>
            </fieldset>

            <div className="grid gap-2">
              <Label htmlFor="custom-subject">یا اسم درس را بنویس</Label>
              <Input
                id="custom-subject"
                value={customSubject}
                onChange={(event) =>
                  onCustomSubjectChange(event.target.value)
                }
                placeholder="مثلاً آناتومی"
                maxLength={60}
              />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-xl border bg-muted/50 p-4">
              <div className="flex gap-3">
                <Focus className="mt-0.5 text-primary" size={20} />
                <div>
                  <Label htmlFor="focus-lock">حالت تمرکز تمام‌صفحه</Label>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    هنگام مطالعه، منوها پنهان می‌شوند تا حواست کمتر پرت شود.
                  </p>
                </div>
              </div>
              <Switch
                id="focus-lock"
                checked={focusLockEnabled}
                onCheckedChange={onFocusLockChange}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-start">
            <Button type="submit" disabled={working}>
              <Play /> شروع مطالعه آزاد
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={!scheduledSessionAvailable || working}
              onClick={onStartScheduledStudy}
            >
              <RotateCcw /> ورود به پارت فعال
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
