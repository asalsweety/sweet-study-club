import { useMutation, useQuery } from '@tanstack/react-query'
import { Check, Heart } from 'lucide-react'
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
    <section aria-label="مطالعه‌ی زنده" className="club-panel flex min-w-0 flex-col gap-3">
      <h2 className="text-base font-bold">مطالعه‌ی زنده</h2>
      <div className="flex flex-wrap items-center gap-2">
        {([
          ['all', `همه ${fa(live.data?.people.length ?? 0)}`],
          ['studying', `در حال مطالعه ${fa(counts?.studying ?? 0)}`],
          ['online', `آنلاین ${fa(counts?.online ?? 0)}`],
          ['offline', `آفلاین ${fa(counts?.offline ?? 0)}`],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
            className={cn('min-h-[27px] rounded-full px-2.5 text-xs font-bold', filter === value ? 'bg-primary text-primary-foreground' : value === 'studying' ? 'bg-[var(--success-soft)] text-[var(--success-text)]' : value === 'online' ? 'bg-[var(--warning-soft)] text-[var(--warning-text)]' : 'bg-muted text-muted-foreground')}
          >
            {label}
          </button>
        ))}
        <select aria-label="نمایش همراهان مطالعه" value={scope} onChange={event => setScope(event.target.value as typeof scope)} className="ms-auto h-[27px] max-w-full rounded-md px-1 text-xs text-muted-foreground">
          <option value="friends">دوستان</option>
          <option value="everyone">همه اعضا</option>
        </select>
      </div>

      {cheer.isError && <p role="alert" className="text-sm text-destructive">{errorMessage(cheer.error)}</p>}

      <ul className="flex flex-col gap-3">
        {live.isPending && <li className="skeleton h-16 rounded-2xl" />}
        {!live.isPending && people.length === 0 && (
          <li className="rounded-2xl bg-muted/40 p-6 text-center text-sm text-muted-foreground">
            {scope === 'friends' ? 'هنوز دوستی اینجا نیست؛ با کد دوستی یا لینک دعوت اضافه‌شان کن.' : 'الان کسی در حال مطالعه نیست. تو اولین نفر باش 🌱'}
          </li>
        )}
        {people.map((person) => (
          <PersonRow
            key={person.userId}
            liveRow
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
                  className="flex min-h-[42px] items-center justify-center gap-2 rounded-[14px] bg-secondary px-3.5 text-xs font-bold text-secondary-foreground disabled:opacity-60 sm:min-w-24"
                >
                  {sent === person.userId ? <Check size={16} /> : <Heart size={16} />} تشویق
                </button>
              ) : null
            }
          />
        ))}
      </ul>
    </section>
  )
}
