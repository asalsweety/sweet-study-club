import { X } from 'lucide-react'
import { toast, useToasts } from '../shared/lib/toast'

export default function Toaster() {
  const toasts = useToasts()
  return (
    <div className="toast-region" dir="rtl" aria-live="polite" aria-relevant="additions">
      {toasts.map((item) => (
        <div key={item.id} className="toast" role="status" data-leaving={item.leaving ? '' : undefined}>
          {item.icon && <span aria-hidden className="toast-icon">{item.icon}</span>}
          <span className="flex-1">{item.text}</span>
          <button type="button" onClick={() => toast.dismiss(item.id)} aria-label="بستن پیام" className="grid size-9 shrink-0 place-items-center rounded-xl text-muted-foreground">
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  )
}
