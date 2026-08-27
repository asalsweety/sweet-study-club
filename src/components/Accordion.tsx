import type { ReactNode } from 'react'
import {
  Accordion as AccordionRoot,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './ui/accordion'
import { cn } from '../shared/lib/utils'

type AccordionProps = {
  title: string
  description?: string
  icon: ReactNode
  children: ReactNode
  defaultOpen?: boolean
  accent?: 'normal' | 'admin'
}

export default function Accordion({
  title,
  description,
  icon,
  children,
  defaultOpen = false,
  accent = 'normal',
}: AccordionProps) {
  return (
    <AccordionRoot
      type="single"
      collapsible
      {...(defaultOpen ? { defaultValue: 'content' } : {})}
      className={cn(
        'rounded-xl border bg-card px-5 shadow-sm',
        accent === 'admin' && 'border-warning/35 bg-warning/5',
      )}
    >
      <AccordionItem value="content">
        <AccordionTrigger className="items-center py-5">
          <span className="flex min-w-0 items-center gap-3">
            <span
              className={cn(
                'grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground [&_svg]:size-5',
                accent === 'admin' && 'bg-warning/15 text-warning-foreground',
              )}
            >
              {icon}
            </span>
            <span className="min-w-0 text-right">
              <strong className="block">{title}</strong>
              {description && (
                <small className="mt-1 block font-normal leading-5 text-muted-foreground">
                  {description}
                </small>
              )}
            </span>
          </span>
        </AccordionTrigger>
        <AccordionContent>{children}</AccordionContent>
      </AccordionItem>
    </AccordionRoot>
  )
}
