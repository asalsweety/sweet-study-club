import { useState } from 'react'
import { Check, Palette } from 'lucide-react'
import { Button } from '../../../components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../../components/ui/dialog'
import { cn } from '../../../shared/lib/utils'
import {
  themePresetOptions,
  type ThemePreset,
} from '../model'

type ThemePickerProps = {
  value: ThemePreset
  onChange: (theme: ThemePreset) => void
}

export default function ThemePicker({
  value,
  onChange,
}: ThemePickerProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="icon"
          variant="outline"
          aria-label="انتخاب پالت رنگ"
        >
          <Palette />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl" dir="rtl">
        <DialogHeader>
          <DialogTitle>رنگ و حال‌وهوای برنامه</DialogTitle>
          <DialogDescription>
            پالت دلخواهت را انتخاب کن. انتخاب روی همین مرورگر ذخیره می‌شود.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-4 sm:grid-cols-2">
          {themePresetOptions.map((themeOption) => {
            const selected = value === themeOption.value

            return (
              <Button
                key={themeOption.value}
                variant="outline"
                className={cn(
                  'h-auto justify-between gap-4 p-4 text-right whitespace-normal',
                  selected && 'border-primary bg-primary/5 ring-2 ring-primary/20',
                )}
                aria-pressed={selected}
                onClick={() => {
                  onChange(themeOption.value)
                  setOpen(false)
                }}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex shrink-0 -space-x-1 space-x-reverse">
                    {themeOption.swatches.map((color) => (
                      <span
                        key={color}
                        className="size-7 rounded-full border-2 border-card shadow-sm"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </span>
                  <span className="min-w-0">
                    <strong className="block truncate">
                      {themeOption.label}
                    </strong>
                    <small className="mt-1 block font-normal text-muted-foreground">
                      {themeOption.description}
                    </small>
                  </span>
                </span>
                {selected && <Check className="shrink-0 text-primary" />}
              </Button>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
