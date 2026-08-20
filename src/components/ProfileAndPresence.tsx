import type { ChangeEvent } from 'react'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  Camera,
  Check,
  CircleUserRound,
  LoaderCircle,
  Pencil,
  Save,
  UsersRound,
  X,
} from 'lucide-react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

type PublicMember = {
  user_id: string
  display_name: string
  avatar_url: string | null
  visible_current_streak: number | null
  show_study_time: boolean
}

type OwnProfile = {
  id: string
  display_name: string
  avatar_url: string | null
}

type PresencePayload = {
  user_id: string
  online_at: string
  status: 'online' | 'studying' | 'break'
  subject_name: string | null
  mode: 'free' | 'scheduled' | 'pomodoro' | null
}

type PresenceMap = Record<string, PresencePayload>

type ProfileAndPresenceProps = {
  userId: string
  displayName: string
  avatarUrl: string | null
  activeStatus: 'online' | 'studying' | 'break'
  activeSubject: string | null
  activeMode: 'free' | 'scheduled' | 'pomodoro' | null
  onProfileUpdated: (profile: OwnProfile) => void
  showMembers?: boolean
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

function flattenPresenceState(
  rawState: Record<string, PresencePayload[]>,
) {
  const result: PresenceMap = {}

  Object.values(rawState).forEach((entries) => {
    entries.forEach((entry) => {
      if (!entry.user_id) return

      const existing = result[entry.user_id]

      if (
        !existing ||
        new Date(entry.online_at).getTime() >
          new Date(existing.online_at).getTime()
      ) {
        result[entry.user_id] = entry
      }
    })
  })

  return result
}

export default function ProfileAndPresence({
  userId,
  displayName,
  avatarUrl,
  activeStatus,
  activeSubject,
  activeMode,
  onProfileUpdated,
  showMembers = true,
}: ProfileAndPresenceProps) {
  const [members, setMembers] = useState<PublicMember[]>([])
  const [presenceMap, setPresenceMap] = useState<PresenceMap>({})
  const [editingName, setEditingName] = useState(false)
  const [nextName, setNextName] = useState(displayName)
  const [savingName, setSavingName] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [message, setMessage] = useState('')
  const channelRef = useRef<RealtimeChannel | null>(null)

  const loadMembers = useCallback(async () => {
    const { data, error } = await supabase
      .from('public_member_profiles')
      .select(
        'user_id, display_name, avatar_url, visible_current_streak, show_study_time',
      )
      .order('display_name', { ascending: true })

    if (error) {
      setMessage(error.message)
      return
    }

    setMembers((data ?? []) as PublicMember[])
  }, [])

  useEffect(() => {
    setNextName(displayName)
  }, [displayName])

  useEffect(() => {
    void loadMembers()
  }, [loadMembers])

  useEffect(() => {
    const channel = supabase.channel('sweet-study-club-main', {
      config: {
        presence: {
          key: userId,
        },
      },
    })

    channelRef.current = channel

    channel
      .on('presence', { event: 'sync' }, () => {
        const state =
          channel.presenceState<PresencePayload>() as Record<
            string,
            PresencePayload[]
          >

        setPresenceMap(flattenPresenceState(state))
      })
      .on('presence', { event: 'join' }, () => {
        const state =
          channel.presenceState<PresencePayload>() as Record<
            string,
            PresencePayload[]
          >

        setPresenceMap(flattenPresenceState(state))
      })
      .on('presence', { event: 'leave' }, () => {
        const state =
          channel.presenceState<PresencePayload>() as Record<
            string,
            PresencePayload[]
          >

        setPresenceMap(flattenPresenceState(state))
      })
      .subscribe(async (status) => {
        if (status !== 'SUBSCRIBED') return

        await channel.track({
          user_id: userId,
          online_at: new Date().toISOString(),
          status: activeStatus,
          subject_name: activeSubject,
          mode: activeMode,
        } satisfies PresencePayload)
      })

    return () => {
      void channel.untrack()
      void supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [userId])

  useEffect(() => {
    const channel = channelRef.current

    if (!channel) return

    void channel.track({
      user_id: userId,
      online_at: new Date().toISOString(),
      status: activeStatus,
      subject_name: activeSubject,
      mode: activeMode,
    } satisfies PresencePayload)
  }, [activeMode, activeStatus, activeSubject, userId])

  const visibleMembers = useMemo(() => {
    return members
      .map((member) => ({
        ...member,
        presence: presenceMap[member.user_id] ?? null,
      }))
      .sort((first, second) => {
        const firstOnline = first.presence ? 1 : 0
        const secondOnline = second.presence ? 1 : 0

        if (secondOnline !== firstOnline) {
          return secondOnline - firstOnline
        }

        return first.display_name.localeCompare(
          second.display_name,
          'fa',
        )
      })
  }, [members, presenceMap])

  const onlineCount = visibleMembers.filter(
    (member) => member.presence,
  ).length

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
      await loadMembers()
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
      await loadMembers()
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

      {showMembers && (
      <article className="online-members-card">
        <div className="online-title">
          <div>
            <p>حضور زنده در اتاق</p>
            <h2>🎀 اعضای آنلاین</h2>
          </div>

          <span>
            <UsersRound size={18} />
            {onlineCount.toLocaleString('fa-IR')} نفر آنلاین
          </span>
        </div>

        <div className="online-member-list">
          {visibleMembers.map((member) => {
            const presence = member.presence
            const isOnline = Boolean(presence)

            return (
              <div
                className={`online-member-row ${
                  isOnline ? 'member-is-online' : ''
                }`}
                key={member.user_id}
              >
                <div className="member-avatar-wrapper">
                  {member.avatar_url ? (
                    <img
                      src={member.avatar_url}
                      alt={member.display_name}
                    />
                  ) : (
                    <span>{firstLetter(member.display_name)}</span>
                  )}

                  <i
                    className={
                      isOnline ? 'online-dot' : 'offline-dot'
                    }
                  />
                </div>

                <div className="member-info">
                  <strong>
                    {member.display_name}
                    {member.user_id === userId ? ' • شما' : ''}
                  </strong>

                  {!presence && <small>آفلاین</small>}

                  {presence?.status === 'online' && (
                    <small>آنلاین</small>
                  )}

                  {presence?.status === 'break' && (
                    <small>در حال استراحت ☕</small>
                  )}

                  {presence?.status === 'studying' && (
                    <small>
                      در حال مطالعه{' '}
                      {presence.subject_name
                        ? `• ${presence.subject_name}`
                        : ''}
                    </small>
                  )}
                </div>

                {member.visible_current_streak !== null && (
                  <span className="member-streak">
                    🔥{' '}
                    {member.visible_current_streak.toLocaleString(
                      'fa-IR',
                    )}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </article>
      )}
    </section>
  )
}
