import { useQuery } from '@tanstack/react-query'
import { api } from '../../app/api'
import { fa, faGrouped, formatDuration, formatToman } from '../../shared/lib/format'

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
          <p className="mt-1 text-lg font-bold">{value}</p>
        </div>
      ))}
    </section>
  )
}
