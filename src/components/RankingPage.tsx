import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowUp,
  Crown,
  Flame,
  Medal,
  RefreshCw,
  Trophy,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Alert, AlertDescription } from './ui/alert'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card'
import { EmptyState } from './ui/empty-state'
import { Skeleton } from './ui/skeleton'
import { cn } from '../shared/lib/utils'

type RankingPeriod = 'today' | 'week' | 'month'

type LeaderboardMember = {
  user_id: string
  display_name: string
  avatar_url: string | null
  current_streak: number | null
  today_seconds: number
  week_seconds: number
  month_seconds: number
}

type RankingPageProps = {
  currentUserId: string
  demoMode?: boolean
}

const demoMembers: LeaderboardMember[] = [
  {
    user_id: 'demo-friend-1',
    display_name: 'سارا',
    avatar_url: null,
    current_streak: 12,
    today_seconds: 14_400,
    week_seconds: 176_400,
    month_seconds: 514_800,
  },
  {
    user_id: 'demo-user',
    display_name: 'کاربر نمایشی',
    avatar_url: null,
    current_streak: 6,
    today_seconds: 8_100,
    week_seconds: 151_200,
    month_seconds: 439_200,
  },
  {
    user_id: 'demo-friend-2',
    display_name: 'نیلوفر',
    avatar_url: null,
    current_streak: 4,
    today_seconds: 6_900,
    week_seconds: 126_000,
    month_seconds: 381_600,
  },
  {
    user_id: 'demo-friend-3',
    display_name: 'مهسا',
    avatar_url: null,
    current_streak: 9,
    today_seconds: 5_400,
    week_seconds: 118_800,
    month_seconds: 356_400,
  },
]

function firstLetter(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || '?'
}

function secondsToReadable(value: number | null | undefined) {
  const seconds = Math.max(0, Number(value) || 0)
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours > 0) {
    return `${hours.toLocaleString('fa-IR')} ساعت و ${minutes.toLocaleString('fa-IR')} دقیقه`
  }

  return `${minutes.toLocaleString('fa-IR')} دقیقه`
}

export default function RankingPage({
  currentUserId,
  demoMode = false,
}: RankingPageProps) {
  const [members, setMembers] = useState<LeaderboardMember[]>([])
  const [period, setPeriod] = useState<RankingPeriod>('today')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [message, setMessage] = useState('')

  const loadRanking = useCallback(async () => {
    setRefreshing(true)
    setMessage('')

    if (demoMode) {
      setMembers(demoMembers)
      setLoading(false)
      setRefreshing(false)
      return
    }

    const { data, error } = await supabase.rpc('get_public_leaderboard')

    if (error) setMessage(error.message)
    else setMembers((data ?? []) as LeaderboardMember[])

    setLoading(false)
    setRefreshing(false)
  }, [demoMode])

  useEffect(() => {
    void loadRanking()
  }, [loadRanking])

  const rankedMembers = useMemo(() => {
    const field =
      period === 'today'
        ? 'today_seconds'
        : period === 'week'
          ? 'week_seconds'
          : 'month_seconds'

    return [...members]
      .sort(
        (first, second) =>
          Number(second[field]) - Number(first[field]),
      )
      .map((member, index) => ({
        ...member,
        rank: index + 1,
        visibleSeconds: Number(member[field]),
      }))
  }, [members, period])

  const currentUserPosition = rankedMembers.findIndex(
    (member) => member.user_id === currentUserId,
  )
  const currentUser =
    currentUserPosition >= 0 ? rankedMembers[currentUserPosition] : null
  const nextMember =
    currentUserPosition > 0 ? rankedMembers[currentUserPosition - 1] : null
  const distanceToNextRank =
    currentUser && nextMember
      ? Math.max(0, nextMember.visibleSeconds - currentUser.visibleSeconds)
      : null

  if (loading) {
    return (
      <div className="grid gap-5" aria-label="در حال بارگذاری رتبه‌ها">
        <Skeleton className="h-20" />
        <Skeleton className="h-40" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  const periodLabels: Array<[RankingPeriod, string]> = [
    ['today', 'امروز'],
    ['week', 'این هفته'],
    ['month', 'این ماه'],
  ]

  return (
    <section className="grid gap-5">
      <header className="flex items-center justify-between gap-4">
        <div>
          <Badge variant="secondary">رقابت دوستانه</Badge>
          <h2 className="mt-2 text-2xl font-black sm:text-3xl">رتبه‌بندی</h2>
        </div>
        <Button
          size="icon"
          variant="outline"
          disabled={refreshing}
          aria-label="به‌روزرسانی رتبه‌ها"
          onClick={() => void loadRanking()}
        >
          <RefreshCw className={cn(refreshing && 'animate-spin')} />
        </Button>
      </header>

      {message && (
        <Alert variant="destructive">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <div
        className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1"
        role="tablist"
        aria-label="بازه رتبه‌بندی"
      >
        {periodLabels.map(([value, label]) => (
          <Button
            key={value}
            role="tab"
            aria-selected={period === value}
            variant={period === value ? 'default' : 'ghost'}
            onClick={() => setPeriod(value)}
          >
            {label}
          </Button>
        ))}
      </div>

      {currentUser && (
        <Card className="border-primary/25 bg-primary/5">
          <CardContent className="grid gap-5 pt-6 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">رتبه فعلی شما</p>
              <strong className="mt-1 block text-3xl text-primary">
                رتبه {currentUser.rank.toLocaleString('fa-IR')}
              </strong>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">زمان مطالعه</p>
              <strong className="mt-1 block text-lg">
                {secondsToReadable(currentUser.visibleSeconds)}
              </strong>
            </div>
            {distanceToNextRank !== null && distanceToNextRank > 0 && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground sm:col-span-2">
                <ArrowUp className="text-success" size={17} />
                فقط {secondsToReadable(distanceToNextRank)} تا رتبه بالاتر فاصله داری.
              </p>
            )}
            {currentUser.rank === 1 && (
              <p className="flex items-center gap-2 text-sm sm:col-span-2">
                <Crown className="text-warning" size={18} /> اکنون نفر اول این بازه هستی.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="text-primary" size={21} /> جدول اعضا
            </CardTitle>
            <CardDescription className="mt-1">
              فقط زمان مطالعه و نام عمومی نمایش داده می‌شود.
            </CardDescription>
          </div>
          <Badge variant="outline">
            {rankedMembers.length.toLocaleString('fa-IR')} عضو
          </Badge>
        </CardHeader>
        <CardContent>
          {rankedMembers.length === 0 ? (
            <EmptyState
              icon={<Trophy />}
              title="هنوز رتبه‌ای وجود ندارد"
              description="بعد از ثبت اولین مطالعه، جدول اینجا ساخته می‌شود."
            />
          ) : (
            <div className="divide-y">
              {rankedMembers.slice(0, 50).map((member) => (
                <div
                  className={cn(
                    'grid grid-cols-[2rem_2.75rem_minmax(0,1fr)_auto] items-center gap-3 py-3',
                    member.user_id === currentUserId &&
                      'rounded-xl bg-primary/5 px-3',
                  )}
                  key={member.user_id}
                >
                  <span className="grid size-8 place-items-center font-black text-muted-foreground">
                    {member.rank <= 3 ? (
                      <Medal
                        className={cn(
                          member.rank === 1 && 'text-warning',
                          member.rank === 2 && 'text-muted-foreground',
                          member.rank === 3 && 'text-chart-5',
                        )}
                        size={20}
                      />
                    ) : (
                      member.rank.toLocaleString('fa-IR')
                    )}
                  </span>

                  {member.avatar_url ? (
                    <img
                      className="size-11 rounded-xl object-cover"
                      src={member.avatar_url}
                      alt=""
                    />
                  ) : (
                    <span className="grid size-11 place-items-center rounded-xl bg-secondary font-black text-secondary-foreground">
                      {firstLetter(member.display_name)}
                    </span>
                  )}

                  <div className="min-w-0">
                    <strong className="block truncate text-sm">
                      {member.display_name}
                      {member.user_id === currentUserId ? ' · شما' : ''}
                    </strong>
                    {member.current_streak !== null && (
                      <small className="mt-1 flex items-center gap-1 text-muted-foreground">
                        <Flame size={13} />
                        {member.current_streak.toLocaleString('fa-IR')} روز پیوسته
                      </small>
                    )}
                  </div>

                  <b className="text-left text-xs sm:text-sm">
                    {secondsToReadable(member.visibleSeconds)}
                  </b>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
