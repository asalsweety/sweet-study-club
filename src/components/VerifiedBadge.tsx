import { BadgeCheck } from 'lucide-react'
import { cn } from '../shared/lib/utils'

/** The admin-granted "authentic account" tick shown after a member's name. */
export default function VerifiedBadge({ verified, size = 16, className }: { verified?: boolean | undefined; size?: number; className?: string }) {
  if (!verified) return null
  return (
    <span role="img" aria-label="حساب تأییدشده" title="حساب تأییدشده" className={cn('verified-badge', className)}>
      <BadgeCheck size={size} strokeWidth={2.4} aria-hidden />
    </span>
  )
}
