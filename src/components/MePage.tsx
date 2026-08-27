import { useState } from 'react'
import {
  Bell,
  Crown,
  LockKeyhole,
  Settings,
  ShieldCheck,
  UserRound,
  UsersRound,
} from 'lucide-react'
import AdminPanel from './AdminPanel'
import Accordion from './Accordion'
import PrivacySettings from './PrivacySettings'
import ProfileAndPresence from './ProfileAndPresence'
import GamificationProfile from './GamificationProfile'
import StudyDNA from './StudyDNA'
import StudyCircle from './StudyCircle'
import type { Profile } from '../entities/profile/model'
import { Badge } from './ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Label } from './ui/label'
import { Switch } from './ui/switch'

type MePageProps = {
  profile: Profile
  demoMode?: boolean
  onProfileUpdated: (profile: Profile) => void
}

export default function MePage({
  profile,
  demoMode = false,
  onProfileUpdated,
}: MePageProps) {
  const [studyReminders, setStudyReminders] = useState(true)
  const [publicStudyTime, setPublicStudyTime] = useState(true)

  return (
    <section className="grid gap-5">
      <header className="flex items-center justify-between gap-4">
        <div>
          <Badge variant="secondary">حساب شخصی من</Badge>
          <h2 className="mt-2 text-2xl font-black sm:text-3xl">حساب من</h2>
        </div>
        <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
          <ShieldCheck size={25} />
        </span>
      </header>

      {demoMode ? (
        <>
          <Card>
            <CardContent className="flex flex-col items-center gap-5 pt-6 text-center sm:flex-row sm:text-right">
              <span className="grid size-20 shrink-0 place-items-center rounded-3xl bg-primary text-3xl font-black text-primary-foreground">
                {profile.displayName.slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <Badge variant="outline">حساب نمایشی</Badge>
                <h3 className="mt-2 text-xl font-black">{profile.displayName}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  این پروفایل برای بازبینی همه صفحه‌هاست و اطلاعات آن ذخیره نمی‌شود.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="text-primary" size={20} /> تنظیمات سریع
              </CardTitle>
              <CardDescription>
                این کنترل‌ها در نسخه نمایشی فقط روی همین مرورگر اثر دارند.
              </CardDescription>
            </CardHeader>
            <CardContent className="divide-y">
              <div className="flex items-center justify-between gap-4 py-4 first:pt-0">
                <div className="flex gap-3">
                  <Bell className="mt-0.5 text-muted-foreground" size={19} />
                  <div>
                    <Label htmlFor="study-reminders">یادآوری مطالعه</Label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      یادآوری ملایم برای برنامه روزانه
                    </p>
                  </div>
                </div>
                <Switch
                  id="study-reminders"
                  checked={studyReminders}
                  onCheckedChange={setStudyReminders}
                />
              </div>
              <div className="flex items-center justify-between gap-4 py-4 last:pb-0">
                <div className="flex gap-3">
                  <LockKeyhole className="mt-0.5 text-muted-foreground" size={19} />
                  <div>
                    <Label htmlFor="public-study-time">نمایش زمان مطالعه</Label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      دوستان فقط زمان کل را می‌بینند، نه جزئیات درس
                    </p>
                  </div>
                </div>
                <Switch
                  id="public-study-time"
                  checked={publicStudyTime}
                  onCheckedChange={setPublicStudyTime}
                />
              </div>
            </CardContent>
          </Card>

          <Accordion
            title="درباره نسخه نمایشی"
            description="چه چیزهایی واقعی هستند و چه چیزهایی نمونه‌اند؟"
            icon={<UserRound />}
          >
            <p className="rounded-xl bg-muted/50 p-4 leading-7 text-muted-foreground">
              مسیرهای ناوبری، تایمر، حالت تمرکز، تغییر تم و تنظیمات همین صفحه کار می‌کنند.
              آمار و اعضای رتبه‌بندی داده نمونه‌اند تا طراحی را بدون ساخت حساب واقعی بررسی کنی.
            </p>
          </Accordion>
        </>
      ) : (
        <>
          <ProfileAndPresence
            userId={profile.id}
            displayName={profile.displayName}
            avatarUrl={profile.avatarUrl}
            onProfileUpdated={(updatedProfile) => {
              onProfileUpdated({
                ...profile,
                displayName: updatedProfile.display_name,
                avatarUrl: updatedProfile.avatar_url,
              })
            }}
          />

          <GamificationProfile userId={profile.id} role={profile.role} />
          <StudyDNA />

          <div className="grid gap-3">
            <Accordion
              title="Study Circle"
              description="دوست‌های مطالعاتی، درخواست‌ها و لینک دعوت"
              icon={<UsersRound size={21} />}
            >
              <StudyCircle />
            </Accordion>

            <Accordion
              title="حریم خصوصی"
              description="کنترل اطلاعاتی که دیگران می‌بینند"
              icon={<LockKeyhole size={21} />}
            >
              <PrivacySettings userId={profile.id} />
            </Accordion>

            {profile.role === 'admin' && (
              <Accordion
                title="پنل مدیریت"
                description="مدیریت پارت‌ها و تنظیمات اتاق"
                icon={<Crown size={21} />}
                accent="admin"
              >
                <AdminPanel />
              </Accordion>
            )}
          </div>
        </>
      )}
    </section>
  )
}
