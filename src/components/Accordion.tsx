import { type ReactNode, useState } from 'react'
import { ChevronDown } from 'lucide-react'

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
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <section
      className={`settings-accordion ${
        isOpen ? 'accordion-open' : ''
      } ${accent === 'admin' ? 'admin-accordion' : ''}`}
    >
      <button
        type="button"
        className="accordion-trigger"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className="accordion-icon">{icon}</span>

        <span className="accordion-title">
          <strong>{title}</strong>
          {description && <small>{description}</small>}
        </span>

        <ChevronDown
          className="accordion-chevron"
          size={20}
        />
      </button>

      {isOpen && (
        <div className="accordion-content">{children}</div>
      )}
    </section>
  )
}
