import { useMutation, useQueryClient } from '@tanstack/react-query'
import { BookOpen, Check, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { api } from '../../app/api'
import { queryKeys, useSubjects } from '../../app/session'
import { errorMessage } from '../../shared/api/http'
import type { Subject } from '../../shared/api/settings'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'

const palette = ['#22c55e', '#f97316', '#3b82f6', '#a855f7', '#ec4899', '#14b8a6', '#eab308', '#6366f1', '#ef4444', '#0ea5e9']
const emojis = ['📘', '🧬', '⚗️', '🧲', '📐', '📚', '🕌', '🌙', '🌍', '🧠', '✍️', '🎯']

export default function SubjectsPanel() {
  const client = useQueryClient()
  const subjects = useSubjects()
  const [name, setName] = useState('')
  const [color, setColor] = useState(palette[0]!)
  const [emoji, setEmoji] = useState(emojis[0]!)
  const apply = (next: Subject[]) => client.setQueryData(queryKeys.subjects, next)

  const create = useMutation({
    mutationFn: () => api.subjects.create({ name: name.trim(), color, emoji }),
    onSuccess: (next) => {
      apply(next)
      setName('')
    },
  })
  const recolor = useMutation({
    mutationFn: (subject: Subject) => api.subjects.update(subject.id, { name: subject.name, color: subject.color, emoji: subject.emoji }),
    onSuccess: apply,
  })
  const remove = useMutation({ mutationFn: (id: string) => api.subjects.remove(id), onSuccess: apply })
  const error = create.error ?? recolor.error ?? remove.error

  return (
    <section className="glass rise flex flex-col gap-4 rounded-[2rem] p-5 sm:p-6">
      <h2 className="flex items-center gap-2 text-lg font-black"><BookOpen size={19} className="text-primary" /> درس‌های من</h2>

      <ul className="flex flex-wrap gap-2">
        {(subjects.data ?? []).map((subject) => (
          <li key={subject.id} className="group flex items-center gap-1.5 rounded-full py-1 pr-1 pl-3 text-sm font-bold text-white shadow-sm" style={{ background: subject.color }}>
            <button
              type="button"
              aria-label={`تغییر رنگ ${subject.name}`}
              onClick={() => recolor.mutate({ ...subject, color: palette[(palette.indexOf(subject.color) + 1) % palette.length]! })}
              className="grid size-7 place-items-center rounded-full bg-white/25"
            >
              {subject.emoji}
            </button>
            {subject.name}
            <button type="button" aria-label={`حذف ${subject.name}`} onClick={() => remove.mutate(subject.id)} className="opacity-70 transition hover:opacity-100">
              <Trash2 size={14} />
            </button>
          </li>
        ))}
      </ul>

      <form
        className="flex flex-col gap-3 rounded-2xl bg-muted/40 p-3"
        onSubmit={(event) => {
          event.preventDefault()
          if (name.trim()) create.mutate()
        }}
      >
        <div className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="درس یا مبحث جدید" aria-label="نام درس جدید" />
          <Button type="submit" disabled={!name.trim() || create.isPending} className="rounded-xl"><Plus /> افزودن</Button>
        </div>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="رنگ">
          {palette.map((value) => (
            <button key={value} type="button" role="radio" aria-checked={color === value} aria-label={value} onClick={() => setColor(value)} className="grid size-7 place-items-center rounded-full ring-offset-2 ring-offset-card transition" style={{ background: value, boxShadow: color === value ? `0 0 0 2px ${value}` : undefined }}>
              {color === value && <Check size={14} className="text-white" />}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="ایموجی">
          {emojis.map((value) => (
            <button key={value} type="button" role="radio" aria-checked={emoji === value} onClick={() => setEmoji(value)} className={`grid size-9 place-items-center rounded-xl text-lg transition ${emoji === value ? 'bg-card shadow ring-2 ring-primary' : 'hover:bg-card'}`}>
              {value}
            </button>
          ))}
        </div>
      </form>
      {error && <p className="text-sm text-destructive">{errorMessage(error)}</p>}
    </section>
  )
}
