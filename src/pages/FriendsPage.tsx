import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ban, Check, UserMinus, X } from 'lucide-react'
import { api } from '../app/api'
import { queryKeys } from '../app/session'
import type { FriendsResponse } from '../shared/api/social'
import { fa } from '../shared/lib/format'
import Avatar from '../components/Avatar'
import { Button } from '../components/ui/button'
import AddFriendPanel from '../features/social/AddFriendPanel'
import LiveStudyPanel from '../features/social/LiveStudyPanel'
import PersonRow from '../features/social/PersonRow'

export default function FriendsPage() {
  const client = useQueryClient()
  const friends = useQuery({ queryKey: queryKeys.friends, queryFn: api.social.friends, refetchInterval: 60_000 })
  const apply = (next: FriendsResponse) => {
    client.setQueryData(queryKeys.friends, next)
    void client.invalidateQueries({ queryKey: ['live'] })
  }
  const respond = useMutation({ mutationFn: (v: { userId: string; accept: boolean }) => api.social.respond(v.userId, v.accept), onSuccess: apply })
  const remove = useMutation({ mutationFn: api.social.remove, onSuccess: apply })
  const block = useMutation({ mutationFn: api.social.block, onSuccess: apply })
  const unblock = useMutation({ mutationFn: api.social.unblock, onSuccess: apply })
  const data = friends.data

  return (
    <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
      <div className="flex flex-col gap-5">
        <LiveStudyPanel />
        <section className="glass rise flex flex-col gap-3 rounded-[2rem] p-5 sm:p-6">
          <h2 className="text-lg font-black">دوستان من {data && <span className="text-sm text-muted-foreground">({fa(data.friends.length)})</span>}</h2>
          <ul className="flex flex-col gap-2">
            {friends.isPending && <li className="skeleton h-16 rounded-2xl" />}
            {data?.friends.length === 0 && <li className="rounded-2xl bg-muted/40 p-5 text-center text-sm text-muted-foreground">هنوز دوستی اضافه نکردی.</li>}
            {data?.friends.map((friend) => (
              <PersonRow
                key={friend.userId}
                name={friend.displayName}
                avatarUrl={friend.avatarUrl}
                status={friend.status}
                subjectName={friend.subjectName}
                todaySeconds={friend.todaySeconds}
                actions={
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" aria-label={`حذف ${friend.displayName}`} onClick={() => confirm(`${friend.displayName} از دوستانت حذف شود؟`) && remove.mutate(friend.userId)}>
                      <UserMinus size={16} />
                    </Button>
                    <Button size="icon" variant="ghost" aria-label={`مسدود کردن ${friend.displayName}`} onClick={() => confirm(`${friend.displayName} مسدود شود؟ دیگر تو را نمی‌بیند.`) && block.mutate(friend.userId)}>
                      <Ban size={16} />
                    </Button>
                  </div>
                }
              />
            ))}
          </ul>
        </section>
      </div>

      <div className="flex flex-col gap-5">
        <AddFriendPanel />

        {data && data.incoming.length + data.outgoing.length > 0 && (
          <section className="glass rise flex flex-col gap-3 rounded-[2rem] p-5 sm:p-6">
            <h2 className="text-lg font-black">درخواست‌ها</h2>
            <ul className="flex flex-col gap-2">
              {data.incoming.map((request) => (
                <li key={request.userId} className="flex items-center gap-3 rounded-2xl bg-primary/5 p-3 ring-1 ring-primary/20">
                  <Avatar name={request.displayName} url={request.avatarUrl} size="md" />
                  <p className="min-w-0 flex-1 truncate font-bold">{request.displayName}</p>
                  <Button size="icon" aria-label="قبول" onClick={() => respond.mutate({ userId: request.userId, accept: true })} className="rounded-xl"><Check size={16} /></Button>
                  <Button size="icon" variant="ghost" aria-label="رد" onClick={() => respond.mutate({ userId: request.userId, accept: false })}><X size={16} /></Button>
                </li>
              ))}
              {data.outgoing.map((request) => (
                <li key={request.userId} className="flex items-center gap-3 rounded-2xl bg-muted/40 p-3">
                  <Avatar name={request.displayName} url={request.avatarUrl} size="md" />
                  <p className="min-w-0 flex-1 truncate font-bold">{request.displayName}</p>
                  <span className="text-xs text-muted-foreground">در انتظار</span>
                  <Button size="icon" variant="ghost" aria-label="لغو درخواست" onClick={() => remove.mutate(request.userId)}><X size={16} /></Button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {data && data.blocked.length > 0 && (
          <section className="glass rise flex flex-col gap-3 rounded-[2rem] p-5 sm:p-6">
            <h2 className="text-lg font-black">مسدودشده‌ها</h2>
            <ul className="flex flex-col gap-2">
              {data.blocked.map((person) => (
                <li key={person.userId} className="flex items-center gap-3 rounded-2xl bg-muted/40 p-3">
                  <Avatar name={person.displayName} url={person.avatarUrl} size="sm" />
                  <p className="min-w-0 flex-1 truncate text-sm font-bold">{person.displayName}</p>
                  <Button size="sm" variant="ghost" onClick={() => unblock.mutate(person.userId)}>رفع مسدودی</Button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}
