import { Download, SquarePlus } from 'lucide-react'
import { lazy, Suspense, useState } from 'react'
import { Button } from '../../components/ui/button'
import { toast } from '../../shared/lib/toast'
import { cn } from '../../shared/lib/utils'
import { promptInstall, useInstallMode } from './install'

// The step-by-step sheet (and its dialog library) loads only when needed.
const InstallSteps = lazy(() => import('./InstallSteps'))

/**
 * "Add to home screen": the real install prompt where the browser offers one,
 * and short picture-free steps on iPhone/iPad and other browsers.
 */
export default function InstallAppButton({ variant = 'icon', className, onDone }: { variant?: 'icon' | 'row' | 'card'; className?: string; onDone?: () => void }) {
  const mode = useInstallMode()
  const [help, setHelp] = useState(false)
  if (!mode) return null

  const start = async () => {
    if (mode === 'prompt') {
      if (await promptInstall()) toast('سوئیت استادی روی صفحۀ اصلی‌ات نشست!', { icon: '🌸' })
      onDone?.()
    } else setHelp(true)
  }

  const label = 'افزودن به صفحۀ اصلی'
  return <>
    {variant === 'icon' && (
      <button type="button" onClick={() => void start()} aria-label={label} title={label} className={cn('header-icon-button', className)}>
        <Download size={18} />
      </button>
    )}
    {variant === 'row' && (
      <button type="button" onClick={() => void start()} className={cn('nav-item w-full text-right', className)}>
        <Download size={19} /><span className="min-w-0 flex-1">{label}</span>
      </button>
    )}
    {variant === 'card' && (
      <div className={cn('install-card', className)}>
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground"><SquarePlus size={20} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">سوئیت استادی را مثل یک اپ نصب کن</p>
          <p className="text-xs leading-6 text-muted-foreground">تمام‌صفحه، بدون نوار مرورگر، با یک لمس از صفحۀ اصلی.</p>
        </div>
        <Button size="sm" onClick={() => void start()}>نصب</Button>
      </div>
    )}

    {help && <Suspense fallback={null}><InstallSteps apple={mode === 'apple'} onClose={() => setHelp(false)} /></Suspense>}
  </>
}
