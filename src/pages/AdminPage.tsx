import { lazy, Suspense } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import PageHeading from '../components/PageHeading'
import { AdminOverview } from '../features/admin/AdminOverview'
const AdminUsers = lazy(() => import('../features/admin/AdminUsers'))
const AdminContent = lazy(() => import('../features/admin/AdminContent'))
const AdminSchedule = lazy(() => import('../features/admin/AdminSchedule'))
const AdminLearning = lazy(() => import('../features/admin/AdminLearning'))
const AdminFeedback = lazy(() => import('../features/admin/AdminFeedback'))
const sections = [['overview', 'نمای کلی'], ['users', 'مدیریت اعضا'], ['schedule', 'برنامۀ باشگاه'], ['learning', 'محتوای آموزشی'], ['content', 'محصولات و پیام‌ها'], ['feedback', 'بازخوردها']] as const
export default function AdminPage() {
  const [params] = useSearchParams()
  const requested = params.get('section')
  const section = sections.some(([id]) => id === requested) ? requested : 'overview'
  return <div className="grid min-w-0 gap-6">
    <PageHeading eyebrow="SWEET STUDIO" title="مدیریت باشگاه" description="هر بخش در جای خودش؛ از برنامۀ روزانه تا همراهی با اعضا." />
    <nav className="section-tabs" aria-label="بخش‌های مدیریت">
      {sections.map(([id, label]) => <Link key={id} to={`?section=${id}`} aria-current={section === id ? 'page' : undefined}>{label}</Link>)}
    </nav>
    <Suspense fallback={<div className="skeleton h-64 rounded-2xl" aria-label="در حال بارگذاری" />}>
      {section === 'overview' && <AdminOverview />}
      {section === 'schedule' && <AdminSchedule />}
      {section === 'learning' && <AdminLearning />}
      {section === 'users' && <AdminUsers />}
      {section === 'content' && <AdminContent />}
      {section === 'feedback' && <AdminFeedback />}
    </Suspense>
  </div>
}
