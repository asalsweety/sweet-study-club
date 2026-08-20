import {
  Crown,
  LockKeyhole,
  Settings,
  ShieldCheck,
  UsersRound,
} from 'lucide-react'
import AdminPanel from './AdminPanel'
import Accordion from './Accordion'
import PrivacySettings from './PrivacySettings'
import ProfileAndPresence from './ProfileAndPresence'
import GamificationProfile from './GamificationProfile'
import StudyDNA from './StudyDNA'
import StudyCircle from './StudyCircle'

type Profile = {
  id: string
  email: string
  display_name: string
  avatar_url: string | null
  role: 'member' | 'admin'
  theme: 'light' | 'dark' | 'system'
}

type MePageProps = {
  profile: Profile
  onProfileUpdated: (profile: Profile) => void
}

export default function MePage({
  profile,
  onProfileUpdated,
}: MePageProps) {
  return (
    <section className="me-page">
      <header className="me-page-header">
        <div>
          <p>حساب شخصی من</p>
          <h2>Me</h2>
        </div>

        <ShieldCheck size={31} />
      </header>

      <ProfileAndPresence
        userId={profile.id}
        displayName={profile.display_name}
        avatarUrl={profile.avatar_url}
        activeStatus="online"
        activeSubject={null}
        activeMode={null}
        showMembers={false}
        onProfileUpdated={(updatedProfile) => {
          onProfileUpdated({
            ...profile,
            display_name: updatedProfile.display_name,
            avatar_url: updatedProfile.avatar_url,
          })
        }}
      />

      <GamificationProfile
        userId={profile.id}
        role={profile.role}
      />

      <StudyDNA />

      <div className="me-accordion-list">
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

        <Accordion
          title="تنظیمات"
          description="تم، اعلان‌ها و تنظیمات حساب"
          icon={<Settings size={21} />}
        >
          <div className="settings-coming-soon">
            تنظیمات کامل حساب در مرحله بعدی توسعه اضافه می‌شود.
          </div>
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
    </section>
  )
}
