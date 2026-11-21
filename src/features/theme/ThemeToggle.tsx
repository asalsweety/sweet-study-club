import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Moon, Sun } from 'lucide-react'
import { api } from '../../app/api'
import { queryKeys } from '../../app/session'
import { haptic } from '../../shared/lib/confetti'
import { cn } from '../../shared/lib/utils'
import { getThemePreference, setThemePreference } from './model'
import { useTheme } from './useTheme'

/** One tap between light and dark; the choice is saved to the account. */
export default function ThemeToggle({ className }: { className?: string }) {
  const client = useQueryClient()
  const { mode } = useTheme()
  const save = useMutation({
    mutationFn: (next: 'light' | 'dark') => api.profile.update({ theme: next }),
    onSuccess: (profile) => client.setQueryData(queryKeys.profile, profile),
  })
  const next = mode === 'dark' ? 'light' : 'dark'
  const label = next === 'dark' ? 'حالت تیره' : 'حالت روشن'
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn('header-icon-button theme-toggle', className)}
      data-mode={mode}
      onClick={() => {
        const previous = getThemePreference()
        haptic(6)
        setThemePreference(next)
        save.mutate(next, { onError: () => setThemePreference(previous) })
      }}
    >
      <Sun size={18} className="theme-toggle-sun" aria-hidden />
      <Moon size={18} className="theme-toggle-moon" aria-hidden />
    </button>
  )
}
