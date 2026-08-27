import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/shared/lib/utils'

type EmptyStateProps = ComponentProps<'div'> & {
  icon?: ReactNode
  title: string
  description: string
  action?: ReactNode
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        'flex min-h-52 flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/35 p-8 text-center',
        className,
      )}
      {...props}
    >
      {icon && (
        <div className="grid size-11 place-items-center rounded-xl bg-secondary text-secondary-foreground [&_svg]:size-5">
          {icon}
        </div>
      )}
      <div className="space-y-1">
        <h3 className="font-semibold">{title}</h3>
        <p className="max-w-sm text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
      {action}
    </div>
  )
}
