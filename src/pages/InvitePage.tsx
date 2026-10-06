import { useMutation, useQueryClient } from '@tanstack/react-query'
import { HeartHandshake, LoaderCircle } from 'lucide-react'
import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../app/api'
import { appRoutes } from '../app/navigation/routes'
import { queryKeys } from '../app/session'
import { errorMessage } from '../shared/api/http'
import { Button } from '../components/ui/button'

export default function InvitePage() {
  const { token = '' } = useParams()
  const client = useQueryClient()
  const accept = useMutation({
    mutationFn: () => api.social.acceptInvite(token),
    onSuccess: (result) => client.setQueryData(queryKeys.friends, result),
  })

  useEffect(() => {
    if (token && accept.isIdle) accept.mutate()
    // Accept exactly once per page load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  return (
    <section className="glass rise mx-auto mt-10 flex max-w-md flex-col items-center gap-4 rounded-[2rem] p-8 text-center">
      <span className="grid size-16 place-items-center rounded-3xl bg-primary/10 text-primary">
        {accept.isPending ? <LoaderCircle className="animate-spin" /> : <HeartHandshake size={30} />}
      </span>
      {accept.isPending && <p className="font-bold">در حال پذیرفتن دعوت...</p>}
      {accept.isSuccess && (
        <>
          <h1 className="text-2xl font-black">حالا با هم دوست هستید 💞</h1>
          <p className="text-sm text-muted-foreground">از این به بعد مطالعه‌ی زنده‌ی هم را می‌بینید و می‌توانید همدیگر را تشویق کنید.</p>
        </>
      )}
      {accept.isError && (
        <>
          <h1 className="text-xl font-black">دعوت پذیرفته نشد</h1>
          <p className="text-sm text-muted-foreground">{errorMessage(accept.error, 'این لینک دعوت نامعتبر یا منقضی است.')}</p>
        </>
      )}
      <Button asChild className="rounded-2xl bg-[image:var(--primary-gradient)] font-bold">
        <Link to={appRoutes.friends}>رفتن به دوستان</Link>
      </Button>
    </section>
  )
}
