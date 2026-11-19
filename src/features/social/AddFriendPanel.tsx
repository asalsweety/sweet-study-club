import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link2, Share2, UserPlus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { api } from '../../app/api'
import { queryKeys, useSettings } from '../../app/session'
import { errorMessage } from '../../shared/api/http'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'

export default function AddFriendPanel() {
  const client = useQueryClient()
  const settings = useSettings()
  const [code, setCode] = useState('')
  const [notice, setNotice] = useState<string | null>(null)

  const add = useMutation({
    mutationFn: () => api.social.addByCode(code.trim().toUpperCase()),
    onSuccess: (result) => {
      client.setQueryData(queryKeys.friends, result)
      setCode('')
      setNotice(result.status === 'accepted' ? 'حالا با هم دوست هستید 💞' : 'درخواست دوستی فرستاده شد.')
    },
  })

  const invite = useMutation({
    mutationFn: api.social.createInvite,
    onSuccess: async ({ token }) => {
      const url = `${window.location.origin}/invite/${token}`
      const text = 'بیا با هم در Sweet Study Club درس بخوانیم 📚'
      try {
        if (navigator.share) await navigator.share({ title: 'Sweet Study Club', text, url })
        else {
          await navigator.clipboard.writeText(url)
          setNotice('لینک دعوت کپی شد؛ برای دوستت بفرست. (۷ روز اعتبار دارد)')
        }
      } catch {
        setNotice(url)
      }
    },
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (code.trim().length < 6 || add.isPending) return
    setNotice(null)
    add.mutate()
  }

  const myCode = settings.data?.friendCode

  return (
    <section className="club-panel flex min-h-[265px] flex-col gap-3">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <UserPlus size={19} className="text-primary" /> افزودن دوست
      </h2>

      <button type="button" className="self-start rounded text-start text-xs font-bold text-primary hover:underline"
        disabled={!myCode} onClick={() => myCode && void navigator.clipboard.writeText(myCode).then(() => setNotice('کد کپی شد.')).catch(() => setNotice(myCode))}>
        کد دوستی تو: <bdi>{myCode ?? '…'}</bdi> · کپی کد
      </button>

      <label htmlFor="friend-code" className="text-xs font-bold">کد دوستی دوستت</label>
      <form onSubmit={submit} className="flex gap-2">
        <Input id="friend-code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="مثلاً SARA1094"
          dir="ltr"
          maxLength={12}
          className="h-11 text-right uppercase"
          aria-label="کد دوستی دوستت"
        />
        <Button type="submit" disabled={code.trim().length < 6 || add.isPending} className="rounded-xl font-bold">
          افزودن
        </Button>
      </form>

      <Button variant="secondary" onClick={() => invite.mutate()} disabled={invite.isPending} className="rounded-2xl font-bold">
        {typeof navigator !== 'undefined' && 'share' in navigator ? <Share2 /> : <Link2 />} ساخت لینک دعوت
      </Button>

      {(notice || add.isError || invite.isError) && (
        <p role="status" className="break-all rounded-2xl bg-muted/70 px-4 py-3 text-sm">
          {add.isError ? errorMessage(add.error) : invite.isError ? errorMessage(invite.error) : notice}
        </p>
      )}
    </section>
  )
}
