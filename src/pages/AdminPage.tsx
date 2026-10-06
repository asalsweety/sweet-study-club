import { ShieldCheck } from 'lucide-react'
import AdminContent from '../features/admin/AdminContent'
import { AdminOverview, AdminUsers } from '../features/admin/AdminOverview'
import AdminSchedule from '../features/admin/AdminSchedule'

export default function AdminPage() {
  return (
    <div className="flex flex-col gap-5">
      <header className="rise">
        <h1 className="flex items-center gap-2 text-3xl font-black tracking-tight"><ShieldCheck className="text-primary" /> Sweet Studio</h1>
        <p className="text-sm text-muted-foreground">مدیریت کاربران، برنامه‌ی روزانه، محصولات و اطلاعیه‌ها.</p>
      </header>
      <AdminOverview />
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="flex flex-col gap-5">
          <AdminSchedule />
          <AdminUsers />
        </div>
        <AdminContent />
      </div>
    </div>
  )
}
