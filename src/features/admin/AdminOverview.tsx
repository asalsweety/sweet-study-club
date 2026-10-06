import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { useState } from 'react'
import { api } from '../../app/api'
import { errorMessage } from '../../shared/api/http'
import { fa, faGrouped, formatDuration, formatHours, formatToman } from '../../shared/lib/format'
import { Input } from '../../components/ui/input'

export function AdminOverview() {
  const overview = useQuery({ queryKey: ['admin', 'overview'], queryFn: api.admin.overview, refetchInterval: 60_000 }).data
  const tiles = overview
    ? [
        ['کاربران', faGrouped(overview.users)],
        ['فعال امروز', fa(overview.activeToday)],
        ['در حال مطالعه', fa(overview.studyingNow)],
        ['مطالعه‌ی امروز', formatDuration(overview.studiedTodaySeconds)],
        ['درآمد', formatToman(overview.revenueToman)],
        ['برنامه‌های در انتظار', fa(overview.pendingPlanRequests)],
      ]
    : []
  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-6">
      {overview === undefined && Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton h-24 rounded-3xl" />)}
      {tiles.map(([label, value]) => (
        <div key={label} className="glass rounded-3xl p-4">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 text-lg font-black">{value}</p>
        </div>
      ))}
    </section>
  )
}

export function AdminUsers() {
  const client = useQueryClient()
  const [q, setQ] = useState('')
  const users = useQuery({ queryKey: ['admin', 'users', q], queryFn: () => api.admin.users(q) })
  const role = useMutation({
    mutationFn: (v: { id: string; role: 'member' | 'admin' }) => api.admin.setRole(v.id, v.role),
    onSuccess: () => client.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })

  return (
    <section className="glass flex flex-col gap-3 rounded-[2rem] p-5">
      <h2 className="text-lg font-black">کاربران</h2>
      <div className="relative">
        <Search size={16} className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جست‌وجوی نام یا ایمیل" className="pr-9" />
      </div>
      {role.isError && <p className="text-sm text-destructive">{errorMessage(role.error)}</p>}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr className="text-right">
              <th className="py-2 font-bold">نام</th>
              <th className="py-2 font-bold">ایمیل</th>
              <th className="py-2 font-bold">مطالعه</th>
              <th className="py-2 font-bold">نقش</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {users.data?.map((user) => (
              <tr key={user.id}>
                <td className="py-2.5 font-bold">{user.displayName}</td>
                <td className="py-2.5 text-muted-foreground" dir="ltr">{user.email}</td>
                <td className="py-2.5">{formatHours(user.totalSeconds)}</td>
                <td className="py-2.5">
                  <select
                    aria-label={`نقش ${user.displayName}`}
                    value={user.role}
                    onChange={(e) => role.mutate({ id: user.id, role: e.target.value as 'member' | 'admin' })}
                    className="rounded-lg border border-border bg-card px-2 py-1"
                  >
                    <option value="member">عضو</option>
                    <option value="admin">مدیر</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
