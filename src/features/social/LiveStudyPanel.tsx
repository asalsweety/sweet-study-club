import { useMutation, useQuery } from '@tanstack/react-query'
import { Radio } from 'lucide-react'
import { useState } from 'react'
import { api } from '../../app/api'
import { queryKeys } from '../../app/session'
import { errorMessage } from '../../shared/api/http'
import { fa } from '../../shared/lib/format'
import { haptic } from '../../shared/lib/confetti'
import { toast } from '../../shared/lib/toast'
import { cn } from '../../shared/lib/utils'
import PersonRow from './PersonRow'

type Filter = 'all' | 'studying' | 'online' | 'offline'

export default function LiveStudyPanel() {
  const [scope, setScope] = useState<'friends' | 'everyone'>('friends')
  const [filter, setFilter] = useState<Filter>('all')
  const [sent, setSent] = useState<string | null>(null)
  const live = useQuery({ queryKey: queryKeys.live(scope), queryFn: () => api.social.live(scope), refetchInterval: 30_000 })
  const cheer = useMutation({
    mutationFn: (userId: string) => api.social.cheer(userId, '💖'),
    onSuccess: (_, userId) => {
      setSent(userId)
      haptic([10, 40, 10])
      const name = live.data?.people.find((person) => person.userId === userId)?.displayName
      toast(`تشویقت برای ${name ?? 'دوستت'} فرستاده شد`, { icon: '💖', duration: 3200 })
    },
  })

  const people = (live.data?.people ?? []).filter((person) =>
    filter === 'all' ? true : filter === 'online' ? person.status === 'online' || person.status === 'break' : person.status === filter,
  )
  const counts = live.data?.counts

  return (
    <section className="glass rise flex flex-col gap-4 rounded-2xl p-5 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Radio size={19} className="text-[var(--success)] motion-safe:animate-pulse" /> مطالعه‌ی زنده
        </h2>
        <div className="flex rounded-xl bg-muted/70 p-1 text-xs font-bold">
          {(['friends', 'everyone'] as const).map((value) => (
            <button key={value} type="button" aria-pressed={scope === value} onClick={() => setScope(value)} className={cn('rounded-lg px-3 py-1.5', scope === value ? 'bg-card shadow-sm' : 'text-muted-foreground')}>
              {value === 'friends' ? 'دوستان' : 'همه'}
            </button>
          ))}
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {([
          ['all', 'همه'],
          ['studying', `در حال مطالعه ${fa(counts?.studying ?? 0)}`],
          ['online', `آنلاین ${fa(counts?.online ?? 0)}`],
          ['offline', `آفلاین ${fa(counts?.offline ?? 0)}`],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
            className={cn('rounded-full border px-3 py-1 text-xs font-bold transition', filter === value ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground')}
          >
            {label}
          </button>
        ))}
      </div>

      {cheer.isError && <p role="alert" className="text-sm text-destructive">{errorMessage(cheer.error)}</p>}

      <ul className="flex flex-col gap-2">
        {live.isPending && <li className="skeleton h-16 rounded-2xl" />}
        {!live.isPending && people.length === 0 && (
          <li className="rounded-2xl bg-muted/40 p-6 text-center text-sm text-muted-foreground">
            {scope === 'friends' ? 'هنوز دوستی اینجا نیست؛ با کد دوستی یا لینک دعوت اضافه‌شان کن.' : 'الان کسی در حال مطالعه نیست. تو اولین نفر باش 🌱'}
          </li>
        )}
        {people.map((person) => (
          <PersonRow
            key={person.userId}
            name={person.displayName}
            avatarUrl={person.avatarUrl}
            status={person.status}
            subjectName={person.subjectName}
            todaySeconds={person.todaySeconds}
            liveSeconds={person.status === 'studying' || person.status === 'break' ? person.elapsedSeconds : null}
            actions={
              person.isFriend && person.status === 'studying' ? (
                <button
                  type="button"
                  disabled={cheer.isPending || sent === person.userId}
                  onClick={() => cheer.mutate(person.userId)}
                  aria-label={`تشویق ${person.displayName}`}
                  className="grid size-10 place-items-center rounded-xl bg-primary/10 text-lg transition hover:scale-110 active:scale-90 disabled:opacity-60"
                >
                  {sent === person.userId ? <span className="[animation:pop-in_420ms_var(--ease-spring)_backwards]">✓</span> : '💖'}
                </button>
              ) : null
            }
          />
        ))}
      </ul>
    </section>
  )
}
