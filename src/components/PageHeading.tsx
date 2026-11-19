import type { ReactNode } from 'react'
export default function PageHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: ReactNode }) {
  return <header className="page-heading"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1><p className="page-description">{description}</p></div>{action && <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">{action}</div>}</header>
}
