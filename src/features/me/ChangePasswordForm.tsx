import { useMutation } from '@tanstack/react-query'
import { KeyRound, LoaderCircle } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { auth } from '../../app/auth'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { errorMessage } from '../../shared/api/http'
import { toast } from '../../shared/lib/toast'

export default function ChangePasswordForm() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [repeat, setRepeat] = useState('')
  const mismatch = repeat.length > 0 && next !== repeat
  const change = useMutation({
    mutationFn: () => auth.changePassword(current, next),
    onSuccess: () => {
      setCurrent('')
      setNext('')
      setRepeat('')
      toast('رمزت عوض شد. بقیۀ دستگاه‌ها از حساب خارج شدند.', { icon: '🔐' })
    },
  })
  const ready = Boolean(current) && next.length >= 10 && next === repeat
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (ready && !change.isPending) change.mutate()
  }
  return (
    <form onSubmit={submit} className="mt-5 grid gap-3 border-t border-border pt-5" aria-label="تغییر رمز عبور">
      <h3 className="flex items-center gap-2 text-sm font-bold"><KeyRound size={16} />تغییر رمز عبور</h3>
      <p className="text-xs leading-6 text-muted-foreground">اگر مدیر باشگاه برایت رمز موقت ساخته، همین‌جا رمز خودت را بگذار.</p>
      <div className="grid gap-1.5">
        <Label htmlFor="password-current">رمز فعلی</Label>
        <Input id="password-current" type="password" dir="ltr" required autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="password-new">رمز تازه</Label>
        <Input id="password-new" type="password" dir="ltr" required minLength={10} maxLength={128} autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} aria-describedby="password-new-hint" />
        <p id="password-new-hint" className="text-xs text-muted-foreground">حداقل ۱۰ کاراکتر.</p>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="password-repeat">تکرار رمز تازه</Label>
        <Input id="password-repeat" type="password" dir="ltr" required autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} aria-invalid={mismatch || undefined} />
        {mismatch && <p className="text-xs text-[var(--destructive-text)]">دو رمز با هم یکی نیستند.</p>}
      </div>
      {change.isError && <p role="alert" className="rounded-xl bg-[var(--destructive-soft)] p-3 text-sm text-[var(--destructive-text)]">{errorMessage(change.error)}</p>}
      <Button type="submit" variant="outline" disabled={change.isPending || !ready}>{change.isPending && <LoaderCircle className="animate-spin" />}ذخیرۀ رمز تازه</Button>
    </form>
  )
}
