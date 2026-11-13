import { AlertTriangle } from 'lucide-react'
import { useSyncExternalStore } from 'react'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog'
import { confirmStore } from '../shared/lib/confirm'

/** Renders the app-wide confirmation dialog requested through confirmAction(). */
export default function ConfirmHost() {
  const request = useSyncExternalStore(confirmStore.subscribe, confirmStore.get, confirmStore.get)
  return (
    <Dialog open={Boolean(request)} onOpenChange={(open) => { if (!open) confirmStore.settle(false) }}>
      <DialogContent dir="rtl" className="sm:max-w-sm" showCloseButton={false}>
        <div className="flex items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--destructive-soft)] text-[var(--destructive-text)]"><AlertTriangle size={20} /></span>
          <div className="grid gap-1.5">
            <DialogTitle className="text-lg">{request?.title}</DialogTitle>
            <DialogDescription>{request?.description ?? 'این کار برگشت‌پذیر نیست.'}</DialogDescription>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="lg" className="rounded-2xl" onClick={() => confirmStore.settle(false)}>انصراف</Button>
          <Button variant="destructive" size="lg" className="rounded-2xl" autoFocus onClick={() => confirmStore.settle(true)}>{request?.confirmLabel ?? 'حذف'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
