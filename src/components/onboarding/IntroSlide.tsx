import type { LucideIcon } from 'lucide-react'

type Props = {
  title: string
  text: string
  icon: LucideIcon
  eyebrow: string
}

export default function IntroSlide({
  title,
  text,
  icon: Icon,
  eyebrow,
}: Props) {
  return (
    <section className="space-y-5">
      <div className="grid size-12 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
        <Icon className="size-6" />
      </div>
      <div className="space-y-3">
        <p className="text-sm font-semibold text-primary">{eyebrow}</p>
        <h1 className="text-3xl font-black leading-tight tracking-tight text-balance sm:text-4xl">
          {title}
        </h1>
        <p className="max-w-xl text-base leading-8 text-muted-foreground sm:text-lg">
          {text}
        </p>
      </div>
    </section>
  )
}
