import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  Ban,
  Check,
  Copy,
  Link2,
  LoaderCircle,
  RefreshCw,
  RotateCcw,
  Search,
  Share2,
  UserMinus,
  UserPlus,
  UsersRound,
  X,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

type CircleIdentity = {
  invite_token: string
  allow_requests: boolean
  discoverable_by_invite: boolean
  show_today: boolean
  show_streak: boolean
  show_level: boolean
  show_live: boolean
  show_subject: boolean
}

type CircleFriend = {
  friend_id: string
  display_name: string
  avatar_url: string | null
  friendship_created_at: string
}

type CircleRequest = {
  request_id: string
  direction: 'received' | 'sent'
  other_user_id: string
  display_name: string
  avatar_url: string | null
  created_at: string
}

type BlockedMember = {
  blocked_user_id: string
  display_name: string
  avatar_url: string | null
  blocked_at: string
}

type SearchResult = {
  user_id: string
  display_name: string
  avatar_url: string | null
  relationship_status:
    | 'self'
    | 'blocked'
    | 'friends'
    | 'request_sent'
    | 'request_received'
    | 'none'
  can_receive_request: boolean
}

type CircleTab = 'friends' | 'requests' | 'invite' | 'settings'

function firstLetter(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || '?'
}

function extractInviteToken(value: string) {
  const trimmedValue = value.trim()

  if (!trimmedValue) return ''

  try {
    const url = new URL(trimmedValue)
    return (
      url.searchParams.get('circle') ??
      url.pathname.split('/').filter(Boolean).pop() ??
      ''
    )
  } catch {
    return trimmedValue
      .replace(/^.*[?&]circle=/i, '')
      .split('&')[0]
      .trim()
      .toLowerCase()
  }
}

function relationshipLabel(
  relationship: SearchResult['relationship_status'],
) {
  if (relationship === 'self') return 'این لینک متعلق به خودت است.'
  if (relationship === 'friends') return 'از قبل در Study Circle شماست.'
  if (relationship === 'request_sent') return 'درخواست قبلاً ارسال شده.'
  if (relationship === 'request_received') {
    return 'از این شخص یک درخواست دریافت کرده‌ای.'
  }
  if (relationship === 'blocked') return 'این ارتباط در دسترس نیست.'

  return ''
}

export default function StudyCircle() {
  const [identity, setIdentity] =
    useState<CircleIdentity | null>(null)

  const [friends, setFriends] = useState<CircleFriend[]>([])
  const [requests, setRequests] = useState<CircleRequest[]>([])
  const [blockedMembers, setBlockedMembers] = useState<
    BlockedMember[]
  >([])

  const [activeTab, setActiveTab] =
    useState<CircleTab>('friends')

  const [inviteInput, setInviteInput] = useState('')
  const [searchResult, setSearchResult] =
    useState<SearchResult | null>(null)

  const [loading, setLoading] = useState(true)
  const [workingAction, setWorkingAction] =
    useState<string | null>(null)

  const [message, setMessage] = useState('')

  const publicAppUrl = useMemo(() => {
    const configuredUrl =
      import.meta.env.VITE_PUBLIC_APP_URL?.trim()

    return (
      configuredUrl || window.location.origin
    ).replace(/\/$/, '')
  }, [])

  const inviteLink = useMemo(() => {
    if (!identity?.invite_token) return ''

    return `${publicAppUrl}/?circle=${encodeURIComponent(
      identity.invite_token,
    )}`
  }, [identity?.invite_token, publicAppUrl])

  const receivedRequests = useMemo(
    () =>
      requests.filter(
        (request) => request.direction === 'received',
      ),
    [requests],
  )

  const sentRequests = useMemo(
    () =>
      requests.filter(
        (request) => request.direction === 'sent',
      ),
    [requests],
  )

  const loadCircle = useCallback(async () => {
    setMessage('')

    const [
      identityResult,
      friendsResult,
      requestsResult,
      blocksResult,
    ] = await Promise.all([
      supabase.rpc('get_my_circle_identity'),
      supabase.rpc('get_my_circle_friends'),
      supabase.rpc('get_my_circle_requests'),
      supabase.rpc('get_my_circle_blocks'),
    ])

    const firstError =
      identityResult.error ||
      friendsResult.error ||
      requestsResult.error ||
      blocksResult.error

    if (firstError) {
      setMessage(firstError.message)
    } else {
      const identityRow = Array.isArray(identityResult.data)
        ? identityResult.data[0]
        : null

      setIdentity((identityRow ?? null) as CircleIdentity | null)
      setFriends((friendsResult.data ?? []) as CircleFriend[])
      setRequests((requestsResult.data ?? []) as CircleRequest[])
      setBlockedMembers(
        (blocksResult.data ?? []) as BlockedMember[],
      )
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    void loadCircle()
  }, [loadCircle])

  useEffect(() => {
    const tokenFromUrl = new URLSearchParams(
      window.location.search,
    ).get('circle')

    if (tokenFromUrl) {
      setInviteInput(tokenFromUrl)
      setActiveTab('invite')
    }
  }, [])

  const copyInviteLink = async () => {
    if (!inviteLink) return

    await navigator.clipboard.writeText(inviteLink)
    setMessage('لینک دعوت کپی شد 🎀')
  }

  const shareInviteLink = async () => {
    if (!inviteLink) return

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Sweet Study Club',
          text: 'بیا در Study Circle من عضو شو و باهم منظم درس بخونیم.',
          url: inviteLink,
        })

        return
      } catch (error) {
        if (
          error instanceof Error &&
          error.name === 'AbortError'
        ) {
          return
        }
      }
    }

    await copyInviteLink()
  }

  const searchMember = async () => {
    const token = extractInviteToken(inviteInput)

    if (!token) {
      setMessage('لینک یا کد دعوت را وارد کن.')
      return
    }

    setWorkingAction('search')
    setSearchResult(null)
    setMessage('')

    const { data, error } = await supabase.rpc(
      'get_circle_profile_by_token',
      {
        requested_token: token,
      },
    )

    if (error) {
      setMessage(error.message)
    } else {
      const firstRow = Array.isArray(data) ? data[0] : null

      if (!firstRow) {
        setMessage(
          'پروفایلی با این لینک پیدا نشد یا لینک غیرفعال است.',
        )
      } else {
        setSearchResult(firstRow as SearchResult)
      }
    }

    setWorkingAction(null)
  }

  const sendRequest = async () => {
    const token = extractInviteToken(inviteInput)

    if (!token || workingAction) return

    setWorkingAction('send-request')
    setMessage('')

    const { error } = await supabase.rpc(
      'send_circle_request',
      {
        requested_token: token,
      },
    )

    if (error) {
      setMessage(error.message)
    } else {
      setMessage('درخواست Study Circle ارسال شد 🌸')
      setSearchResult(null)
      setInviteInput('')
      await loadCircle()
    }

    setWorkingAction(null)
  }

  const respondToRequest = async (
    requestId: string,
    accept: boolean,
  ) => {
    setWorkingAction(requestId)
    setMessage('')

    const { error } = await supabase.rpc(
      'respond_circle_request',
      {
        requested_request_id: requestId,
        requested_accept: accept,
      },
    )

    if (error) {
      setMessage(error.message)
    } else {
      setMessage(
        accept
          ? 'به Study Circle یکدیگر اضافه شدید ❤️'
          : 'درخواست رد شد.',
      )

      await loadCircle()
    }

    setWorkingAction(null)
  }

  const cancelRequest = async (requestId: string) => {
    setWorkingAction(requestId)

    const { error } = await supabase.rpc(
      'cancel_circle_request',
      {
        requested_request_id: requestId,
      },
    )

    if (error) {
      setMessage(error.message)
    } else {
      setMessage('درخواست لغو شد.')
      await loadCircle()
    }

    setWorkingAction(null)
  }

  const removeFriend = async (friend: CircleFriend) => {
    const confirmed = window.confirm(
      `«${friend.display_name}» از Study Circle حذف شود؟`,
    )

    if (!confirmed) return

    setWorkingAction(friend.friend_id)

    const { error } = await supabase.rpc(
      'remove_circle_friend',
      {
        requested_friend_id: friend.friend_id,
      },
    )

    if (error) {
      setMessage(error.message)
    } else {
      setMessage('دوست مطالعاتی حذف شد.')
      await loadCircle()
    }

    setWorkingAction(null)
  }

  const blockUser = async (
    userId: string,
    displayName: string,
  ) => {
    const confirmed = window.confirm(
      `«${displayName}» بلاک شود؟ دیگر وضعیت یکدیگر را نمی‌بینید.`,
    )

    if (!confirmed) return

    setWorkingAction(userId)

    const { error } = await supabase.rpc(
      'block_circle_user',
      {
        requested_user_id: userId,
      },
    )

    if (error) {
      setMessage(error.message)
    } else {
      setMessage('کاربر بلاک شد.')
      await loadCircle()
    }

    setWorkingAction(null)
  }

  const unblockUser = async (userId: string) => {
    setWorkingAction(userId)

    const { error } = await supabase.rpc(
      'unblock_circle_user',
      {
        requested_user_id: userId,
      },
    )

    if (error) {
      setMessage(error.message)
    } else {
      setMessage('کاربر از حالت بلاک خارج شد.')
      await loadCircle()
    }

    setWorkingAction(null)
  }

  const rotateInviteToken = async () => {
    const confirmed = window.confirm(
      'لینک دعوت قبلی غیرفعال و یک لینک جدید ساخته شود؟',
    )

    if (!confirmed) return

    setWorkingAction('rotate-token')

    const { error } = await supabase.rpc(
      'rotate_circle_invite_token',
    )

    if (error) {
      setMessage(error.message)
    } else {
      setMessage('لینک دعوت جدید ساخته شد.')
      await loadCircle()
    }

    setWorkingAction(null)
  }

  const updateSetting = async (
    field: keyof CircleIdentity,
    checked: boolean,
  ) => {
    if (!identity || field === 'invite_token') return

    const previousIdentity = identity
    const nextIdentity = {
      ...identity,
      [field]: checked,
    }

    setIdentity(nextIdentity)
    setWorkingAction(`setting-${field}`)

    const { error } = await supabase.rpc(
      'update_my_circle_settings',
      {
        requested_allow_requests:
          nextIdentity.allow_requests,

        requested_discoverable:
          nextIdentity.discoverable_by_invite,

        requested_show_today: nextIdentity.show_today,
        requested_show_streak: nextIdentity.show_streak,
        requested_show_level: nextIdentity.show_level,
        requested_show_live: nextIdentity.show_live,
        requested_show_subject: nextIdentity.show_subject,
      },
    )

    if (error) {
      setIdentity(previousIdentity)
      setMessage(error.message)
    } else {
      setMessage('تنظیمات Study Circle ذخیره شد.')
    }

    setWorkingAction(null)
  }

  if (loading) {
    return (
      <div className="circle-loading">
        <LoaderCircle className="spin-icon" size={20} />
        در حال آماده‌سازی Study Circle...
      </div>
    )
  }

  return (
    <section className="study-circle">
      <header className="circle-heading">
        <div>
          <p>
            <UsersRound size={18} />
            دوست‌های مطالعاتی
          </p>

          <h2>Study Circle</h2>
        </div>

        <button
          type="button"
          aria-label="به‌روزرسانی"
          onClick={() => void loadCircle()}
        >
          <RefreshCw size={18} />
        </button>
      </header>

      <div className="circle-summary">
        <span>
          <strong>{friends.length.toLocaleString('fa-IR')}</strong>
          دوست مطالعاتی
        </span>

        <span>
          <strong>
            {receivedRequests.length.toLocaleString('fa-IR')}
          </strong>
          درخواست جدید
        </span>
      </div>

      <div className="circle-tabs">
        <button
          className={activeTab === 'friends' ? 'selected' : ''}
          onClick={() => setActiveTab('friends')}
        >
          دوستان
        </button>

        <button
          className={activeTab === 'requests' ? 'selected' : ''}
          onClick={() => setActiveTab('requests')}
        >
          درخواست‌ها
          {receivedRequests.length > 0 && (
            <i>
              {receivedRequests.length.toLocaleString('fa-IR')}
            </i>
          )}
        </button>

        <button
          className={activeTab === 'invite' ? 'selected' : ''}
          onClick={() => setActiveTab('invite')}
        >
          افزودن دوست
        </button>

        <button
          className={activeTab === 'settings' ? 'selected' : ''}
          onClick={() => setActiveTab('settings')}
        >
          تنظیمات
        </button>
      </div>

      {message && <div className="circle-message">{message}</div>}

      {activeTab === 'friends' && (
        <div className="circle-member-list">
          {friends.length === 0 ? (
            <div className="circle-empty">
              <UsersRound size={27} />
              <strong>هنوز کسی در Study Circle تو نیست</strong>
              <p>
                لینک دعوتت را برای دوست‌هایت بفرست تا وضعیت
                درس‌خواندن یکدیگر را ببینید.
              </p>
            </div>
          ) : (
            friends.map((friend) => (
              <article className="circle-member-row" key={friend.friend_id}>
                <div className="circle-avatar">
                  {friend.avatar_url ? (
                    <img
                      src={friend.avatar_url}
                      alt={friend.display_name}
                    />
                  ) : (
                    <span>{firstLetter(friend.display_name)}</span>
                  )}

                  <i />
                </div>

                <div className="circle-member-info">
                  <strong>{friend.display_name}</strong>
                  <small>Study Friend</small>
                </div>

                <div className="circle-row-actions">
                  <button
                    aria-label="حذف دوست"
                    disabled={workingAction === friend.friend_id}
                    onClick={() => void removeFriend(friend)}
                  >
                    <UserMinus size={17} />
                  </button>

                  <button
                    className="danger"
                    aria-label="بلاک"
                    disabled={workingAction === friend.friend_id}
                    onClick={() =>
                      void blockUser(
                        friend.friend_id,
                        friend.display_name,
                      )
                    }
                  >
                    <Ban size={17} />
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="circle-request-sections">
          <section>
            <h3>درخواست‌های دریافتی</h3>

            {receivedRequests.length === 0 ? (
              <p className="circle-inline-empty">
                درخواست جدیدی نداری.
              </p>
            ) : (
              receivedRequests.map((request) => (
                <article
                  className="circle-member-row"
                  key={request.request_id}
                >
                  <div className="circle-avatar">
                    {request.avatar_url ? (
                      <img
                        src={request.avatar_url}
                        alt={request.display_name}
                      />
                    ) : (
                      <span>
                        {firstLetter(request.display_name)}
                      </span>
                    )}
                  </div>

                  <div className="circle-member-info">
                    <strong>{request.display_name}</strong>
                    <small>می‌خواهد دوست مطالعاتی‌ات باشد</small>
                  </div>

                  <div className="circle-row-actions">
                    <button
                      className="accept"
                      disabled={
                        workingAction === request.request_id
                      }
                      onClick={() =>
                        void respondToRequest(
                          request.request_id,
                          true,
                        )
                      }
                    >
                      <Check size={17} />
                    </button>

                    <button
                      className="danger"
                      disabled={
                        workingAction === request.request_id
                      }
                      onClick={() =>
                        void respondToRequest(
                          request.request_id,
                          false,
                        )
                      }
                    >
                      <X size={17} />
                    </button>
                  </div>
                </article>
              ))
            )}
          </section>

          <section>
            <h3>درخواست‌های ارسال‌شده</h3>

            {sentRequests.length === 0 ? (
              <p className="circle-inline-empty">
                درخواست در انتظاری نداری.
              </p>
            ) : (
              sentRequests.map((request) => (
                <article
                  className="circle-member-row"
                  key={request.request_id}
                >
                  <div className="circle-avatar">
                    {request.avatar_url ? (
                      <img
                        src={request.avatar_url}
                        alt={request.display_name}
                      />
                    ) : (
                      <span>
                        {firstLetter(request.display_name)}
                      </span>
                    )}
                  </div>

                  <div className="circle-member-info">
                    <strong>{request.display_name}</strong>
                    <small>در انتظار پاسخ</small>
                  </div>

                  <button
                    className="circle-cancel-request"
                    onClick={() =>
                      void cancelRequest(request.request_id)
                    }
                  >
                    لغو
                  </button>
                </article>
              ))
            )}
          </section>
        </div>
      )}

      {activeTab === 'invite' && (
        <div className="circle-invite-section">
          <article className="my-circle-link">
            <div>
              <Link2 size={20} />
              <span>
                <small>لینک دعوت من</small>
                <strong>{inviteLink}</strong>
              </span>
            </div>

            <div>
              <button onClick={() => void copyInviteLink()}>
                <Copy size={17} />
                کپی
              </button>

              <button onClick={() => void shareInviteLink()}>
                <Share2 size={17} />
                Share
              </button>
            </div>
          </article>

          <div className="circle-search-box">
            <label>
              لینک یا کد دعوت دوستت
              <div>
                <input
                  value={inviteInput}
                  placeholder="لینک یا کد را اینجا وارد کن"
                  onChange={(event) => {
                    setInviteInput(event.target.value)
                    setSearchResult(null)
                  }}
                />

                <button
                  disabled={workingAction === 'search'}
                  onClick={() => void searchMember()}
                >
                  {workingAction === 'search' ? (
                    <LoaderCircle
                      className="spin-icon"
                      size={18}
                    />
                  ) : (
                    <Search size={18} />
                  )}
                </button>
              </div>
            </label>
          </div>

          {searchResult && (
            <article className="circle-search-result">
              <div className="circle-avatar large">
                {searchResult.avatar_url ? (
                  <img
                    src={searchResult.avatar_url}
                    alt={searchResult.display_name}
                  />
                ) : (
                  <span>
                    {firstLetter(searchResult.display_name)}
                  </span>
                )}
              </div>

              <div>
                <strong>{searchResult.display_name}</strong>
                <small>Sweet Study Member</small>

                {relationshipLabel(
                  searchResult.relationship_status,
                ) && (
                  <p>
                    {relationshipLabel(
                      searchResult.relationship_status,
                    )}
                  </p>
                )}
              </div>

              {searchResult.relationship_status === 'none' &&
                searchResult.can_receive_request && (
                  <button
                    disabled={workingAction === 'send-request'}
                    onClick={() => void sendRequest()}
                  >
                    {workingAction === 'send-request' ? (
                      <LoaderCircle
                        className="spin-icon"
                        size={18}
                      />
                    ) : (
                      <UserPlus size={18} />
                    )}
                    ارسال درخواست
                  </button>
                )}
            </article>
          )}
        </div>
      )}

      {activeTab === 'settings' && identity && (
        <div className="circle-settings">
          {[
            {
              field: 'allow_requests' as const,
              title: 'دریافت درخواست دوستی',
              description:
                'کاربران دارای لینک دعوت بتوانند درخواست بفرستند.',
            },
            {
              field: 'discoverable_by_invite' as const,
              title: 'فعال‌بودن لینک دعوت',
              description:
                'پروفایلت با کد یا لینک اختصاصی پیدا شود.',
            },
            {
              field: 'show_live' as const,
              title: 'نمایش وضعیت زنده',
              description:
                'دوستان ببینند در حال مطالعه یا استراحت هستی.',
            },
            {
              field: 'show_subject' as const,
              title: 'نمایش درس فعلی',
              description:
                'نام درس فعلی برای دوستان نمایش داده شود.',
            },
            {
              field: 'show_today' as const,
              title: 'نمایش مطالعه امروز',
              description:
                'مجموع مطالعه امروزت برای دوستان دیده شود.',
            },
            {
              field: 'show_streak' as const,
              title: 'نمایش استریک',
              description:
                'استریک فعلی برای دوستان نمایش داده شود.',
            },
            {
              field: 'show_level' as const,
              title: 'نمایش Level و Badge',
              description:
                'پیشرفت و نشان اصلی برای دوستان دیده شود.',
            },
          ].map((setting) => (
            <label className="circle-setting-row" key={setting.field}>
              <span>
                <strong>{setting.title}</strong>
                <small>{setting.description}</small>
              </span>

              <input
                type="checkbox"
                checked={identity[setting.field]}
                disabled={workingAction !== null}
                onChange={(event) =>
                  void updateSetting(
                    setting.field,
                    event.target.checked,
                  )
                }
              />
            </label>
          ))}

          <button
            className="circle-rotate-link"
            disabled={workingAction === 'rotate-token'}
            onClick={() => void rotateInviteToken()}
          >
            <RotateCcw size={18} />
            ساخت لینک دعوت جدید
          </button>

          {blockedMembers.length > 0 && (
            <section className="circle-blocked-section">
              <h3>کاربران بلاک‌شده</h3>

              {blockedMembers.map((member) => (
                <article
                  className="circle-member-row"
                  key={member.blocked_user_id}
                >
                  <div className="circle-avatar">
                    {member.avatar_url ? (
                      <img
                        src={member.avatar_url}
                        alt={member.display_name}
                      />
                    ) : (
                      <span>
                        {firstLetter(member.display_name)}
                      </span>
                    )}
                  </div>

                  <div className="circle-member-info">
                    <strong>{member.display_name}</strong>
                    <small>بلاک‌شده</small>
                  </div>

                  <button
                    className="circle-unblock-button"
                    onClick={() =>
                      void unblockUser(member.blocked_user_id)
                    }
                  >
                    رفع بلاک
                  </button>
                </article>
              ))}
            </section>
          )}
        </div>
      )}
    </section>
  )
}
