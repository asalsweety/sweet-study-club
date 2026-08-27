import { ArrowRight, Pause, Play, Square } from 'lucide-react'
import type { ActiveStudyState } from '../../../entities/study/model'
import { formatTimer } from '../../../shared/lib/time'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card, CardContent } from '../../../components/ui/card'

type FocusStudyScreenProps = {
  activeState: ActiveStudyState
  elapsedSeconds: number
  themeClass: string
  working: boolean
  onExit: () => void
  onPause: () => void
  onResume: () => void
  onStop: () => void
}

export default function FocusStudyScreen({
  activeState,
  elapsedSeconds,
  themeClass,
  working,
  onExit,
  onPause,
  onResume,
  onStop,
}: FocusStudyScreenProps) {
  const paused = activeState.timerStatus === 'paused'

  return (
    <main
      className={`${themeClass} grid min-h-dvh place-items-center bg-background p-4 text-foreground`}
      dir="rtl"
    >
      <Button
        className="fixed top-4 right-4"
        variant="ghost"
        onClick={onExit}
      >
        <ArrowRight /> خروج از نمای تمرکز
      </Button>

      <Card className="soft-enter w-full max-w-2xl border-primary/20 shadow-2xl shadow-primary/10">
        <CardContent className="flex flex-col items-center px-6 py-14 text-center sm:py-20">
          <Badge variant={paused ? 'secondary' : 'default'}>
            {paused ? 'تایمر متوقف است' : 'در حال مطالعه'}
          </Badge>
          <h1 className="mt-6 text-3xl font-black sm:text-5xl">
            {activeState.subjectName}
          </h1>
          <strong
            className="my-10 font-mono text-6xl tracking-tight text-primary tabular-nums sm:text-8xl"
            dir="ltr"
          >
            {formatTimer(elapsedSeconds)}
          </strong>

          <div className="flex flex-wrap justify-center gap-2">
            {paused ? (
              <Button size="lg" onClick={onResume} disabled={working}>
                <Play /> ادامه
              </Button>
            ) : (
              <Button size="lg" onClick={onPause} disabled={working}>
                <Pause /> توقف موقت
              </Button>
            )}
            <Button
              size="lg"
              variant="destructive"
              onClick={onStop}
              disabled={working}
            >
              <Square /> پایان مطالعه
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
