import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { useRef, type ComponentProps, type PointerEvent } from 'react'
import { cn } from '@/shared/lib/utils'

/**
 * Phone-only drag handle (hidden from the sm breakpoint by CSS). Dragging it
 * moves the sheet with the finger; a long or fast enough pull dismisses it,
 * anything shorter springs back. Keyboard and screen-reader users keep the
 * close button and Escape.
 */
function SheetHandle() {
  const drag = useRef<{ startY: number; startTime: number; dy: number } | null>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const sheetOf = (event: PointerEvent<HTMLElement>) =>
    event.currentTarget.closest<HTMLElement>('[data-slot="dialog-content"]')

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { startY: event.clientY, startTime: performance.now(), dy: 0 }
    const sheet = sheetOf(event)
    if (sheet) sheet.style.transition = 'none'
  }
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current
    const sheet = sheetOf(event)
    if (!state || !sheet) return
    const raw = event.clientY - state.startY
    // Upward drags resist, like a native sheet at full height.
    state.dy = raw > 0 ? raw : raw / 6
    sheet.style.transform = `translateY(${state.dy}px)`
  }
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current
    const sheet = sheetOf(event)
    drag.current = null
    if (!state || !sheet) return
    const velocity = state.dy / Math.max(1, performance.now() - state.startTime)
    const dismiss = state.dy > Math.min(140, sheet.offsetHeight * 0.3) || (state.dy > 24 && velocity > 0.6)
    sheet.style.transition = 'transform 260ms cubic-bezier(0.22, 1, 0.36, 1)'
    if (!dismiss) {
      sheet.style.transform = ''
      return
    }
    sheet.style.transform = 'translateY(100%)'
    sheet.setAttribute('data-swiped', '')
    window.setTimeout(() => closeRef.current?.click(), 200)
  }

  return (
    <>
      <div
        aria-hidden
        className="sheet-handle"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />
      <DialogPrimitive.Close ref={closeRef} tabIndex={-1} aria-hidden className="hidden" />
    </>
  )
}

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

export function DialogPortal(
  props: ComponentProps<typeof DialogPrimitive.Portal>,
) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

export function DialogOverlay({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        'fixed inset-0 z-50 bg-foreground/35 backdrop-blur-sm data-[state=closed]:animate-out data-[state=open]:animate-in',
        className,
      )}
      {...props}
    />
  )
}

export function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          'fixed left-1/2 top-1/2 z-50 grid w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 grid-cols-[minmax(0,1fr)] gap-4 rounded-xl border bg-background p-6 shadow-xl outline-none',
          className,
        )}
        {...props}
      >
        <SheetHandle />
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close className="absolute left-4 top-4 rounded-sm text-muted-foreground opacity-80 transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring">
            <X />
            <span className="sr-only">بستن</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

export function DialogHeader({
  className,
  ...props
}: ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-header"
      className={cn('flex flex-col gap-2 text-right', className)}
      {...props}
    />
  )
}

export function DialogFooter({
  className,
  ...props
}: ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end',
        className,
      )}
      {...props}
    />
  )
}

export function DialogTitle({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn('text-lg font-semibold', className)}
      {...props}
    />
  )
}

export function DialogDescription({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn('text-sm leading-relaxed text-muted-foreground', className)}
      {...props}
    />
  )
}
