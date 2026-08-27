import { Moon, Sun } from 'lucide-react'
import { Button } from '../../../components/ui/button'
import { cn } from '../../../shared/lib/utils'
import type { ColorMode, ThemePreset } from '../model'
import ThemePicker from './ThemePicker'

type ThemeToolbarProps = {
  preset: ThemePreset
  mode: ColorMode
  floating?: boolean
  onPresetChange: (theme: ThemePreset) => void
  onModeChange: (mode: ColorMode) => void
}

export default function ThemeToolbar({
  preset,
  mode,
  floating = false,
  onPresetChange,
  onModeChange,
}: ThemeToolbarProps) {
  const nextMode = mode === 'dark' ? 'light' : 'dark'

  return (
    <div
      className={cn(
        'flex items-center gap-1.5',
        floating &&
          'fixed top-3 left-3 z-40 rounded-2xl border bg-card/90 p-1.5 shadow-lg backdrop-blur-xl sm:top-5 sm:left-5',
      )}
      aria-label="تنظیمات ظاهر"
    >
      <ThemePicker value={preset} onChange={onPresetChange} />
      <Button
        size="icon"
        variant="outline"
        onClick={() => onModeChange(nextMode)}
        aria-label={
          nextMode === 'dark'
            ? 'فعال‌کردن حالت تیره'
            : 'فعال‌کردن حالت روشن'
        }
      >
        {mode === 'dark' ? <Sun /> : <Moon />}
      </Button>
    </div>
  )
}
