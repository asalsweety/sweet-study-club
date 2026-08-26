import type { ChangeEvent } from 'react'
import { useEffect, useState } from 'react'
import {
  Camera,
  Check,
  CircleUserRound,
  LoaderCircle,
  Pencil,
  Save,
  X,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

type OwnProfile = {
  id: string
  display_name: string
  avatar_url: string | null
}

type ProfileAndPresenceProps = {
  userId: string
  displayName: string
  avatarUrl: string | null
  onProfileUpdated: (profile: OwnProfile) => void
}

const MAX_AVATAR_SIZE = 5 * 1024 * 1024

function firstLetter(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || '?'
}

function getExtension(file: File) {
  if (file.type === 'image/png') return 'png'
  if (file.type === 'image/webp') return 'webp'
  return 'jpg'
}

export default function ProfileAndPresence({
  userId,
  displayName,
  avatarUrl,
  onProfileUpdated,
}: ProfileAndPresenceProps) {
  const [editingName, setEditingName] = useState(false)
  const [nextName, setNextName] = useState(displayName)
  const [savingName, setSavingName] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    setNextName(displayName)
  }, [displayName])

  const saveDisplayName = async () => {
    const trimmedName = nextName.trim()

    if (trimmedName.length < 2) {
      setMessage('نام باید حداقل دو کاراکتر باشد.')
      return
    }

    if (trimmedName.length > 40) {
      setMessage('نام نمی‌تواند بیشتر از ۴۰ کاراکتر باشد.')
      return
    }

    setSavingName(true)
    setMessage('')

    const { data, error } = await supabase
      .from('profiles')
      .update({ display_name: trimmedName })
      .eq('id', userId)
      .select('id, display_name, avatar_url')
      .single()

    if (error) {
      setMessage(error.message)
    } else {
      const updatedProfile = data as OwnProfile
      onProfileUpdated(updatedProfile)
      setEditingName(false)
      setMessage('نام پروفایل ذخیره شد 🎀')
    }

    setSavingName(false)
  }

  const uploadAvatar = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) return

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setMessage('فقط عکس JPG، PNG یا WebP قابل قبول است.')
      return
    }

    if (file.size > MAX_AVATAR_SIZE) {
      setMessage('حجم عکس باید کمتر از ۵ مگابایت باشد.')
      return
    }

    setUploadingAvatar(true)
    setMessage('')

    const extension = getExtension(file)
    const filePath = `${userId}/avatar.${extension}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      setMessage(uploadError.message)
      setUploadingAvatar(false)
      return
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('avatars').getPublicUrl(filePath)

    const avatarWithCacheBuster =
      `${publicUrl}?updated=${Date.now()}`

    const { data, error: profileError } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarWithCacheBuster })
      .eq('id', userId)
      .select('id, display_name, avatar_url')
      .single()

    if (profileError) {
      setMessage(profileError.message)
    } else {
      const updatedProfile = data as OwnProfile
      onProfileUpdated(updatedProfile)
      setMessage('عکس پروفایل ذخیره شد 🌸')
    }

    setUploadingAvatar(false)
  }

  return (
    <section className="profile-presence-grid">
      <article className="profile-settings-card">
        <div className="profile-settings-title">
          <div>
            <p>پروفایل شخصی</p>
            <h2>نام و عکس من</h2>
          </div>

          <CircleUserRound size={30} />
        </div>

        <div className="large-profile-avatar">
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} />
          ) : (
            <span>{firstLetter(displayName)}</span>
          )}

          <label className="avatar-upload-button">
            {uploadingAvatar ? (
              <LoaderCircle className="spin-icon" size={18} />
            ) : (
              <Camera size={18} />
            )}

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={uploadingAvatar}
              onChange={uploadAvatar}
            />
          </label>
        </div>

        {editingName ? (
          <div className="profile-name-editor">
            <input
              value={nextName}
              maxLength={40}
              autoFocus
              onChange={(event) => setNextName(event.target.value)}
            />

            <button
              className="save-profile-button"
              onClick={() => void saveDisplayName()}
              disabled={savingName}
            >
              {savingName ? (
                <LoaderCircle className="spin-icon" size={17} />
              ) : (
                <Save size={17} />
              )}
              ذخیره
            </button>

            <button
              className="cancel-profile-button"
              onClick={() => {
                setNextName(displayName)
                setEditingName(false)
              }}
            >
              <X size={17} />
            </button>
          </div>
        ) : (
          <div className="profile-name-display">
            <div>
              <strong>{displayName}</strong>
              <small>
                ایمیل شما برای سایر اعضا نمایش داده نمی‌شود.
              </small>
            </div>

            <button onClick={() => setEditingName(true)}>
              <Pencil size={17} />
              تغییر نام
            </button>
          </div>
        )}

        {message && <div className="profile-message">{message}</div>}

        <div className="profile-security-note">
          <Check size={18} />
          فقط نام، عکس و اطلاعاتی که خودت اجازه داده‌ای عمومی هستند.
        </div>
      </article>

    </section>
  )
}
