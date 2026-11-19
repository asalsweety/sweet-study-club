import { useInfiniteQuery } from '@tanstack/react-query'
import QueryError from '../../components/QueryError'
import { Button } from '../../components/ui/button'
import { listFeedback } from '../feedback/api'

const feedbackDate = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  dateStyle: 'long',
  timeStyle: 'short',
  timeZone: 'Asia/Tehran',
})

export default function AdminFeedback() {
  const inbox = useInfiniteQuery({
    queryKey: ['admin', 'feedback'],
    queryFn: ({ pageParam }) => listFeedback(pageParam),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  })
  const messages = inbox.data?.pages.flatMap(page => page.items) ?? []

  return (
    <section aria-labelledby="admin-feedback-heading" className="surface grid min-w-0 gap-4 p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="admin-feedback-heading" className="text-lg font-bold">بازخورد اعضا</h2>
        <Button variant="ghost" size="sm" disabled={inbox.isFetching} onClick={() => void inbox.refetch()}>تازه‌سازی</Button>
      </header>
      {inbox.isPending && <p role="status" className="text-sm text-muted-foreground">در حال دریافت بازخوردها…</p>}
      {inbox.isSuccess && messages.length === 0 && <p role="status" className="text-sm text-muted-foreground">هنوز بازخوردی ثبت نشده است.</p>}
      {messages.length > 0 && (
        <ul className="grid min-w-0 gap-2">
          {messages.map(({ id, displayName, createdAt, message }) => (
            <li key={id} className="min-w-0 rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <bdi className="min-w-0 text-sm font-bold wrap-anywhere">{displayName}</bdi>
                <time className="text-xs text-muted-foreground" dateTime={createdAt}>{feedbackDate.format(new Date(createdAt))}</time>
              </div>
              <p dir="auto" className="mt-2 text-start text-sm leading-7 whitespace-pre-wrap wrap-anywhere">{message}</p>
            </li>
          ))}
        </ul>
      )}
      {inbox.isError && <QueryError error={inbox.error} retry={() => void (inbox.isFetchNextPageError ? inbox.fetchNextPage() : inbox.refetch())} />}
      {inbox.hasNextPage && !inbox.isFetchNextPageError && (
        <Button variant="outline" className="justify-self-start" disabled={inbox.isFetching} onClick={() => void inbox.fetchNextPage()}>
          {inbox.isFetchingNextPage ? 'در حال دریافت…' : 'نمایش بازخوردهای قدیمی‌تر'}
        </Button>
      )}
    </section>
  )
}
