import PageHeading from '../components/PageHeading'
import QueryError from '../components/QueryError'
import { useQuery } from '@tanstack/react-query'
import { Crown, EyeOff, Trophy } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../app/api'
import { appRoutes } from '../app/navigation/routes'
import { useOnlineStatus } from '../app/pwa/online-status'
import { queryKeys } from '../app/session'
import type { PeriodKind } from '../shared/api/progress'
import type { LeaderboardEntry } from '../shared/api/social'
import { fa, formatDuration, jalaliDay } from '../shared/lib/format'
import { cn } from '../shared/lib/utils'
import './club-reports.css'
import Avatar from '../components/Avatar'
import VerifiedBadge from '../components/VerifiedBadge'

const rankColors = ['bg-primary text-primary-foreground', 'bg-[var(--warning-soft)] text-[var(--warning-text)]', 'bg-secondary text-secondary-foreground']

function studyTime(seconds: number) {
  const rest = seconds % 60
  if (seconds < 60) return `${fa(seconds)} ثانیه`
  return rest ? `${formatDuration(seconds)} و ${fa(rest)} ثانیه` : formatDuration(seconds)
}

function Podium({ entries }: { entries: LeaderboardEntry[] }) {
  return <div className="grid grid-cols-3 items-stretch gap-2 lg:gap-4">
    {[entries[2], entries[0], entries[1]].map((entry, index) => entry ? (
      <div key={entry.userId} className={cn('club-panel league-podium min-w-0', entry.isMe && 'is-me')}>
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn('rounded-full px-2.5 py-1.5 text-xs font-bold', rankColors[entry.rank - 1])}>رتبه {fa(entry.rank)}</span>
          {entry.rank === 1 ? <Crown size={18} aria-hidden /> : <Trophy size={16} aria-hidden />}
          <Avatar name={entry.displayName} url={entry.avatarUrl} size="sm" />
        </div>
        <p className="flex min-w-0 items-center gap-1 font-bold"><span className="truncate">{entry.displayName}{entry.isMe && ' (تو)'}</span><VerifiedBadge verified={entry.verified} size={14} /></p>
        <p className="text-xs font-bold">{studyTime(entry.seconds)}</p>
      </div>
    ) : <div key={index} />)}
  </div>
}

export default function RankingPage() {
  const online = useOnlineStatus()
  const [period, setPeriod] = useState<PeriodKind>('week')
  const [scope, setScope] = useState<'friends' | 'everyone'>('everyone')
  const board = useQuery({
    queryKey: queryKeys.leaderboard(period, scope),
    queryFn: () => api.social.leaderboard(period, scope),
    refetchInterval: online ? 60_000 : false,
  })
  const data = board.data
  const dates = data ? (period === 'day' ? jalaliDay(data.range.from) : `${jalaliDay(data.range.from)} تا ${jalaliDay(data.range.to)}`) : ''

  return (
    <div className="club-report relative flex flex-col gap-5">
      <img src="/images/figma/social-league-library.webp" alt="" width={69} height={69} className="league-title-art" />
      <PageHeading {...(dates && { eyebrow: dates })} title="لیگ مطالعه" description="زمان تایمر بعد از پایان و ذخیرهٔ جلسه، و زمان مطالعهٔ دستی بعد از ثبت، به روز شروع جلسه به وقت تهران اضافه می‌شود. زمان‌های برابر رتبهٔ مشترک دارند." action={
        <div className="club-tabs league-tabs">
          <div className="contents">
            {([['day', 'امروز'], ['week', 'هفته'], ['month', 'ماه']] as const).map(([value, label]) => (
              <button key={value} type="button" aria-pressed={period === value} onClick={() => setPeriod(value)} className={cn('rounded-xl px-3 py-1.5', period === value ? 'bg-card shadow-sm' : 'text-muted-foreground')}>{label}</button>
            ))}
          </div>
          <div className="contents">
            {([['everyone', 'همه'], ['friends', 'دوستان']] as const).map(([value, label]) => (
              <button key={value} type="button" aria-pressed={scope === value} onClick={() => setScope(value)} className={cn('rounded-xl px-3 py-1.5', scope === value ? 'bg-card shadow-sm' : 'text-muted-foreground')}>{label}</button>
            ))}
          </div>
        </div>
      } />

      {data && !data.optedIn && (
        <aside className="flex items-center gap-3 rounded-3xl bg-[var(--warning-soft)] p-4 text-sm">
          <EyeOff size={18} className="shrink-0 text-[var(--warning-text)]" />
          <span>زمان تو در جدول نمایش داده نمی‌شود. <Link to={`${appRoutes.profile}?section=settings`} className="font-bold text-primary underline">از تنظیمات</Link> می‌توانی روشنش کنی.</span>
        </aside>
      )}

      {!online && data && <p role="status" className="text-sm text-muted-foreground">آخرین جدول ذخیره‌شده را می‌بینی. رتبه‌ها بعد از اتصال به‌روز می‌شوند.</p>}
      {!online && !data && (board.isError || board.fetchStatus === 'paused') ? (
        <p role="status" className="club-panel text-sm text-muted-foreground">جدول این بازه و گروه هنوز روی این دستگاه ذخیره نشده است. یک بازه یا گروه دیگر را انتخاب کن یا آنلاین برگرد.</p>
      ) : board.isError && !data ? <QueryError error={board.error} retry={() => void board.refetch()} /> : board.isPending ? (
        <div className="skeleton h-56 rounded-2xl" />
      ) : data && data.entries.length > 0 ? (
        <>
          <Podium entries={data.entries.slice(0, 3)} />
          {data.entries.length > 3 && <ol start={4} className="club-panel flex flex-col gap-3">
            {data.entries.slice(3).map((entry) => (
              <li key={entry.userId} className={cn('flex min-h-[52px] items-center gap-1 rounded-[14px] border border-border bg-background px-3.5 text-sm', entry.isMe && 'bg-primary/10 ring-1 ring-primary/30')}>
                <span className="font-bold">{fa(entry.rank)} · </span>
                <Avatar name={entry.displayName} url={entry.avatarUrl} size="sm" />
                <span className="flex min-w-0 flex-1 items-center gap-1 font-bold"><span className="truncate">{entry.displayName}</span><VerifiedBadge verified={entry.verified} size={14} />{entry.isFriend && <span className="shrink-0"> · دوست</span>}</span>
                <span className="text-xs font-bold tabular-nums text-primary">{studyTime(entry.seconds)}</span>
              </li>
            ))}
          </ol>}
          {data.me && !data.entries.some(entry => entry.isMe) && (
            <p className="glass rounded-2xl p-4 text-center text-sm font-bold">رتبه‌ی تو: {fa(data.me.rank)} · {studyTime(data.me.seconds)}</p>
          )}
        </>
      ) : (
        <p className="glass rounded-2xl p-10 text-center text-muted-foreground">هنوز مطالعه‌ای در این بازه ثبت نشده. با یک جلسه شروع کن.</p>
      )}
    </div>
  )
}
