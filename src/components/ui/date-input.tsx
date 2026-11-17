import type { ComponentProps } from 'react'
import { CalendarDays } from 'lucide-react'
import './date-input.css'

type DateInputProps = Omit<ComponentProps<'input'>, 'type' | 'dir' | 'value' | 'defaultValue'> & { value: string }

export function DateInput({ value, ...props }: DateInputProps) {
  return (
    <div className="date-input">
      <input {...props} className="date-input-native" type="date" dir="ltr" value={value} />
      <span className="date-input-hint" aria-hidden="true">
        <CalendarDays size={18} />
        {!value && 'انتخاب تاریخ'}
      </span>
    </div>
  )
}
