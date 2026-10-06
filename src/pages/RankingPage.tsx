import { useQuery } from '@tanstack/react-query'
import { Crown, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../app/api'
import { appRoutes } from '../app/navigation/routes'
import { queryKeys } from '../app/session'
import type { PeriodKind } from '../shared/api/progress'
import type { LeaderboardEntry } from '../shared/api/social'
import { fa, formatHours } from '../shared/lib/format'
import { cn } from '../shared/lib/utils'
import Avatar from '../components/Avatar'

const medals = ['🥇', '🥈', '🥉']

function Podium({ entries }: { entries: LeaderboardEntry[] }) {
  const order = [entries[1], entries[0], entries[2]]
  return (
    <div className="grid grid-cols-3 items-end gap-3">
      {order.map((entry, index) =>
        entry ? (
          <div key={entry.userId} className={cn('flex flex-col items-center gap-2 rounded-3xl p-4 text-center', index === 1 ? 'glass pb-8 shadow-xl shadow-primary/20' : 'bg-muted/40')}>
            {index === 1 && <Crown className="text-[var(--warning)]" />}
            <Avatar name={entry.displayName} url={entry.avatarUrl} size={index === 1 ? 'xl' : 'lg'} />
            <p className="w-full truncate text-sm font-black">{entry.displayName}</p>
            <p className="text-xs font-bold text-muted-foreground">{medals[entry.rank - 1]} {formatHours(entry.seconds)}</p>
          </div>
        ) : (
          <div key={index} />
        ),
      )}
    </div>
  )
}

export default function RankingPage() {
  const [period, setPeriod] = useState<PeriodKind>('week')
  const [scope, setScope] = useState<'friends' | 'everyone'>('everyone')
  const board = useQuery({ queryKey: queryKeys.leaderboard(period, scope), queryFn: () => api.social.leaderboard(period, scope) })
  const data = board.data

  return (
    <div className="flex flex-col gap-5">
      <header className="rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">لیگ مطالعه</h1>
          <p className="text-sm text-muted-foreground">فقط کسانی که خودشان خواسته‌اند در جدول هستند.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex rounded-2xl bg-muted/70 p-1 text-sm font-bold">
            {([['day', 'امروز'], ['week', 'هفته'], ['month', 'ماه']] as const).map(([value, label]) => (
              <button key={value} type="button" onClick={() => setPeriod(value)} className={cn('rounded-xl px-3 py-1.5', period === value ? 'bg-card shadow-sm' : 'text-muted-foreground')}>{label}</button>
            ))}
          </div>
          <div className="flex rounded-2xl bg-muted/70 p-1 text-sm font-bold">
            {([['everyone', 'همه'], ['friends', 'دوستان']] as const).map(([value, label]) => (
              <button key={value} type="button" onClick={() => setScope(value)} className={cn('rounded-xl px-3 py-1.5', scope === value ? 'bg-card shadow-sm' : 'text-muted-foreground')}>{label}</button>
            ))}
          </div>
        </div>
      </header>

      {data && !data.optedIn && (
        <aside className="flex items-center gap-3 rounded-3xl bg-[var(--warning-soft)] p-4 text-sm">
          <EyeOff size={18} className="shrink-0 text-[var(--warning-text)]" />
          <span>زمان تو در جدول نمایش داده نمی‌شود. <Link to={appRoutes.profile} className="font-bold text-primary underline">از تنظیمات</Link> می‌توانی روشنش کنی.</span>
        </aside>
      )}

      {board.isPending ? (
        <div className="skeleton h-56 rounded-[2rem]" />
      ) : data && data.entries.length > 0 ? (
        <>
          <Podium entries={data.entries.slice(0, 3)} />
          <ol className="glass flex flex-col gap-1 rounded-[2rem] p-3 sm:p-4">
            {data.entries.slice(3).map((entry) => (
              <li key={entry.userId} className={cn('flex items-center gap-3 rounded-2xl px-3 py-2.5', entry.isMe && 'bg-primary/10 ring-1 ring-primary/30')}>
                <span className="w-7 text-center text-sm font-black text-muted-foreground">{fa(entry.rank)}</span>
                <Avatar name={entry.displayName} url={entry.avatarUrl} size="sm" />
                <span className="min-w-0 flex-1 truncate font-bold">{entry.displayName}{entry.isFriend && ' 💞'}</span>
                <span className="font-black tabular-nums">{formatHours(entry.seconds)}</span>
              </li>
            ))}
          </ol>
          {data.me && data.me.rank > 50 && (
            <p className="glass rounded-2xl p-4 text-center text-sm font-bold">رتبه‌ی تو: {fa(data.me.rank)} · {formatHours(data.me.seconds)}</p>
          )}
        </>
      ) : (
        <p className="glass rounded-[2rem] p-10 text-center text-muted-foreground">هنوز کسی در این بازه درس نخوانده. اولین نفر باش! 🏁</p>
      )}
    </div>
  )
}
