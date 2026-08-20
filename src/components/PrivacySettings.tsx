import { useCallback, useEffect, useState } from 'react'
import {
  BookOpen,
  Eye,
  Flame,
  LoaderCircle,
  Radio,
  Trophy,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

type PrivacySettingsProps = {
  userId: string
}

type PrivacyValues = {
  show_study_time: boolean
  show_streak: boolean
  show_total_study: boolean
  show_live_status: boolean
  show_current_subject: boolean
}

type PrivacyItemProps = {
  title: string
  description: string
  icon: React.ReactNode
  checked: boolean
  disabled: boolean
  onChange: (checked: boolean) => void
}

function PrivacyItem({
  title,
  description,
  icon,
  checked,
  disabled,
  onChange,
}: PrivacyItemProps) {
  return (
    <label className="compact-privacy-item">
      <span className="compact-privacy-icon">{icon}</span>

      <span className="compact-privacy-text">
        <strong>{title}</strong>
        <small>{description}</small>
      </span>

      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  )
}

export default function PrivacySettings({
  userId,
}: PrivacySettingsProps) {
  const [settings, setSettings] =
    useState<PrivacyValues | null>(null)

  const [loading, setLoading] = useState(true)
  const [savingField, setSavingField] =
    useState<keyof PrivacyValues | null>(null)

  const [message, setMessage] = useState('')

  const loadSettings = useCallback(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select(
        'show_study_time, show_streak, show_total_study, show_live_status, show_current_subject',
      )
      .eq('id', userId)
      .single()

    if (error) {
      setMessage(error.message)
    } else {
      setSettings(data as PrivacyValues)
    }

    setLoading(false)
  }, [userId])

  useEffect(() => {
    void loadSettings()
  }, [loadSettings])

  const updateSetting = async (
    field: keyof PrivacyValues,
    checked: boolean,
  ) => {
    if (!settings || savingField) return

    const previousSettings = settings
    const nextSettings = {
      ...settings,
      [field]: checked,
    }

    setSettings(nextSettings)
    setSavingField(field)
    setMessage('')

    const { error } = await supabase
      .from('profiles')
      .update({ [field]: checked })
      .eq('id', userId)

    if (error) {
      setSettings(previousSettings)
      setMessage(error.message)
    } else {
      setMessage('تنظیمات ذخیره شد 🎀')
    }

    setSavingField(null)
  }

  if (loading) {
    return (
      <div className="compact-settings-loading">
        <LoaderCircle className="spin-icon" size={19} />
        در حال بارگذاری تنظیمات...
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="compact-settings-message">
        تنظیمات حریم خصوصی بارگذاری نشد.
      </div>
    )
  }

  return (
    <div className="compact-privacy-list">
      <PrivacyItem
        icon={<Eye size={18} />}
        title="نمایش زمان مطالعه"
        description="زمان مطالعه‌ات در لیدربرد نمایش داده شود."
        checked={settings.show_study_time}
        disabled={savingField !== null}
        onChange={(checked) =>
          void updateSetting('show_study_time', checked)
        }
      />

      <PrivacyItem
        icon={<Flame size={18} />}
        title="نمایش استریک"
        description="تعداد روزهای متوالی مطالعه دیده شود."
        checked={settings.show_streak}
        disabled={savingField !== null}
        onChange={(checked) =>
          void updateSetting('show_streak', checked)
        }
      />

      <PrivacyItem
        icon={<Trophy size={18} />}
        title="نمایش مجموع مطالعه"
        description="مجموع زمان مطالعه در پروفایل عمومی دیده شود."
        checked={settings.show_total_study}
        disabled={savingField !== null}
        onChange={(checked) =>
          void updateSetting('show_total_study', checked)
        }
      />

      <PrivacyItem
        icon={<Radio size={18} />}
        title="نمایش در Live Study"
        description="وضعیت آنلاین و مطالعه‌ات برای اعضا نمایش داده شود."
        checked={settings.show_live_status}
        disabled={savingField !== null}
        onChange={(checked) =>
          void updateSetting('show_live_status', checked)
        }
      />

      <PrivacyItem
        icon={<BookOpen size={18} />}
        title="نمایش نام درس فعلی"
        description="اعضا نام درسی را که می‌خوانی ببینند."
        checked={settings.show_current_subject}
        disabled={savingField !== null}
        onChange={(checked) =>
          void updateSetting('show_current_subject', checked)
        }
      />

      {message && (
        <div className="compact-settings-message">{message}</div>
      )}
    </div>
  )
}
