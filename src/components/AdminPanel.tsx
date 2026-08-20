import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  ArrowDown,
  ArrowUp,
  CalendarPlus,
  Check,
  Crown,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  X,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

type StudyTemplate = {
  id: string
  title: string
  start_time: string
  end_time: string
  sort_order: number
  is_active: boolean
}

type EditableTemplate = {
  title: string
  start_time: string
  end_time: string
  is_active: boolean
}

function normalizeTime(value: string) {
  return value.slice(0, 5)
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'خطای نامشخصی رخ داد.'
}

export default function AdminPanel() {
  const [templates, setTemplates] = useState<StudyTemplate[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingValues, setEditingValues] =
    useState<EditableTemplate | null>(null)

  const [newTitle, setNewTitle] = useState('')
  const [newStartTime, setNewStartTime] = useState('08:00')
  const [newEndTime, setNewEndTime] = useState('09:00')

  const [loading, setLoading] = useState(true)
  const [workingId, setWorkingId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [message, setMessage] = useState('')

  const loadTemplates = useCallback(async () => {
    const { data, error } = await supabase
      .from('study_templates')
      .select(
        'id, title, start_time, end_time, sort_order, is_active',
      )
      .order('sort_order', { ascending: true })

    if (error) throw error

    setTemplates((data ?? []) as StudyTemplate[])
  }, [])

  useEffect(() => {
    const initialize = async () => {
      try {
        await loadTemplates()
      } catch (error) {
        setMessage(errorMessage(error))
      } finally {
        setLoading(false)
      }
    }

    void initialize()
  }, [loadTemplates])

  const createTemplate = async (event: FormEvent) => {
    event.preventDefault()

    if (!newTitle.trim()) {
      setMessage('نام پارت را وارد کن.')
      return
    }

    setCreating(true)
    setMessage('')

    const { error } = await supabase.rpc('admin_create_template', {
      requested_title: newTitle.trim(),
      requested_start_time: newStartTime,
      requested_end_time: newEndTime,
    })

    if (error) {
      setMessage(error.message)
    } else {
      setNewTitle('')
      setMessage('پارت جدید ساخته شد 🎀')
      await loadTemplates()
    }

    setCreating(false)
  }

  const beginEditing = (template: StudyTemplate) => {
    setEditingId(template.id)
    setEditingValues({
      title: template.title,
      start_time: normalizeTime(template.start_time),
      end_time: normalizeTime(template.end_time),
      is_active: template.is_active,
    })
    setMessage('')
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditingValues(null)
  }

  const saveTemplate = async (templateId: string) => {
    if (!editingValues) return

    if (!editingValues.title.trim()) {
      setMessage('نام پارت نمی‌تواند خالی باشد.')
      return
    }

    setWorkingId(templateId)
    setMessage('')

    const { error } = await supabase.rpc('admin_update_template', {
      requested_template_id: templateId,
      requested_title: editingValues.title.trim(),
      requested_start_time: editingValues.start_time,
      requested_end_time: editingValues.end_time,
      requested_is_active: editingValues.is_active,
    })

    if (error) {
      setMessage(error.message)
    } else {
      cancelEditing()
      setMessage('تغییرات پارت ذخیره شد ✅')
      await loadTemplates()
    }

    setWorkingId(null)
  }

  const toggleTemplate = async (template: StudyTemplate) => {
    setWorkingId(template.id)
    setMessage('')

    const { error } = await supabase.rpc('admin_update_template', {
      requested_template_id: template.id,
      requested_title: template.title,
      requested_start_time: normalizeTime(template.start_time),
      requested_end_time: normalizeTime(template.end_time),
      requested_is_active: !template.is_active,
    })

    if (error) {
      setMessage(error.message)
    } else {
      setMessage(
        template.is_active
          ? 'پارت غیرفعال شد.'
          : 'پارت دوباره فعال شد.',
      )
      await loadTemplates()
    }

    setWorkingId(null)
  }

  const deleteTemplate = async (template: StudyTemplate) => {
    const confirmed = window.confirm(
      `پارت «${template.title}» حذف شود؟ این کار قابل بازگشت نیست.`,
    )

    if (!confirmed) return

    setWorkingId(template.id)
    setMessage('')

    const { error } = await supabase.rpc('admin_delete_template', {
      requested_template_id: template.id,
    })

    if (error) {
      setMessage(error.message)
    } else {
      setMessage('پارت حذف شد.')
      await loadTemplates()
    }

    setWorkingId(null)
  }

  const moveTemplate = async (
    templateId: string,
    direction: 'up' | 'down',
  ) => {
    const currentIndex = templates.findIndex(
      (template) => template.id === templateId,
    )

    const destinationIndex =
      direction === 'up' ? currentIndex - 1 : currentIndex + 1

    if (
      currentIndex < 0 ||
      destinationIndex < 0 ||
      destinationIndex >= templates.length
    ) {
      return
    }

    const reordered = [...templates]
    const [selectedTemplate] = reordered.splice(currentIndex, 1)
    reordered.splice(destinationIndex, 0, selectedTemplate)

    setTemplates(reordered)
    setWorkingId(templateId)
    setMessage('')

    const requestedItems = reordered.map((template, index) => ({
      id: template.id,
      sort_order: index + 1,
    }))

    const { error } = await supabase.rpc('admin_reorder_templates', {
      requested_items: requestedItems,
    })

    if (error) {
      setMessage(error.message)
      await loadTemplates()
    } else {
      setMessage('ترتیب پارت‌ها ذخیره شد.')
      await loadTemplates()
    }

    setWorkingId(null)
  }

  const generateUpcomingSessions = async () => {
    setGenerating(true)
    setMessage('')

    const { data, error } = await supabase.rpc(
      'admin_generate_upcoming_sessions',
    )

    if (error) {
      setMessage(error.message)
    } else {
      const generatedCount = Number(data ?? 0)

      setMessage(
        generatedCount > 0
          ? `${generatedCount.toLocaleString(
              'fa-IR',
            )} پارت جدید ساخته شد.`
          : 'همه پارت‌های روزهای آینده از قبل آماده بودند.',
      )
    }

    setGenerating(false)
  }

  if (loading) {
    return (
      <section className="admin-panel admin-panel-loading">
        در حال بارگذاری پنل مدیریت...
      </section>
    )
  }

  return (
    <section className="admin-panel">
      <div className="admin-heading">
        <div>
          <p>
            <Crown size={18} />
            دسترسی مدیر
          </p>
          <h2>مدیریت پارت‌های درسی</h2>
        </div>

        <button
          className="admin-generate-button"
          disabled={generating}
          onClick={() => void generateUpcomingSessions()}
        >
          {generating ? (
            <LoaderCircle className="spin-icon" size={18} />
          ) : (
            <CalendarPlus size={18} />
          )}
          ساخت پارت‌های آینده
        </button>
      </div>

      {message && <div className="admin-message">{message}</div>}

      <form className="admin-create-form" onSubmit={createTemplate}>
        <div className="admin-create-title">
          <Plus size={20} />
          <strong>افزودن پارت جدید</strong>
        </div>

        <label>
          نام پارت
          <input
            value={newTitle}
            maxLength={80}
            placeholder="مثلاً 🫀 Cardiology Focus"
            onChange={(event) => setNewTitle(event.target.value)}
          />
        </label>

        <label>
          ساعت شروع
          <input
            type="time"
            value={newStartTime}
            onChange={(event) => setNewStartTime(event.target.value)}
          />
        </label>

        <label>
          ساعت پایان
          <input
            type="time"
            value={newEndTime}
            onChange={(event) => setNewEndTime(event.target.value)}
          />
        </label>

        <button
          className="admin-primary-button"
          type="submit"
          disabled={creating}
        >
          {creating ? (
            <LoaderCircle className="spin-icon" size={18} />
          ) : (
            <Plus size={18} />
          )}
          ساخت پارت
        </button>
      </form>

      <div className="admin-template-list">
        {templates.map((template, index) => {
          const isEditing = editingId === template.id
          const isWorking = workingId === template.id

          return (
            <article
              className={`admin-template-row ${
                template.is_active
                  ? 'admin-template-active'
                  : 'admin-template-inactive'
              }`}
              key={template.id}
            >
              <div className="admin-order-controls">
                <button
                  aria-label="انتقال به بالا"
                  disabled={index === 0 || isWorking}
                  onClick={() =>
                    void moveTemplate(template.id, 'up')
                  }
                >
                  <ArrowUp size={17} />
                </button>

                <span>{(index + 1).toLocaleString('fa-IR')}</span>

                <button
                  aria-label="انتقال به پایین"
                  disabled={
                    index === templates.length - 1 || isWorking
                  }
                  onClick={() =>
                    void moveTemplate(template.id, 'down')
                  }
                >
                  <ArrowDown size={17} />
                </button>
              </div>

              {isEditing && editingValues ? (
                <div className="admin-edit-fields">
                  <input
                    value={editingValues.title}
                    maxLength={80}
                    onChange={(event) =>
                      setEditingValues({
                        ...editingValues,
                        title: event.target.value,
                      })
                    }
                  />

                  <div>
                    <label>
                      شروع
                      <input
                        type="time"
                        value={editingValues.start_time}
                        onChange={(event) =>
                          setEditingValues({
                            ...editingValues,
                            start_time: event.target.value,
                          })
                        }
                      />
                    </label>

                    <label>
                      پایان
                      <input
                        type="time"
                        value={editingValues.end_time}
                        onChange={(event) =>
                          setEditingValues({
                            ...editingValues,
                            end_time: event.target.value,
                          })
                        }
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <div className="admin-template-info">
                  <strong>{template.title}</strong>

                  <span>
                    {normalizeTime(template.start_time)} تا{' '}
                    {normalizeTime(template.end_time)}
                  </span>

                  <small>
                    {template.is_active
                      ? 'فعال و قابل ساخت'
                      : 'غیرفعال'}
                  </small>
                </div>
              )}

              <div className="admin-template-actions">
                {isWorking ? (
                  <LoaderCircle className="spin-icon" size={20} />
                ) : isEditing ? (
                  <>
                    <button
                      className="admin-save-action"
                      aria-label="ذخیره"
                      onClick={() => void saveTemplate(template.id)}
                    >
                      <Save size={18} />
                    </button>

                    <button
                      className="admin-cancel-action"
                      aria-label="لغو"
                      onClick={cancelEditing}
                    >
                      <X size={18} />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="admin-edit-action"
                      aria-label="ویرایش"
                      onClick={() => beginEditing(template)}
                    >
                      <Pencil size={18} />
                    </button>

                    <button
                      className={`admin-toggle-action ${
                        template.is_active ? 'is-on' : 'is-off'
                      }`}
                      aria-label="تغییر وضعیت"
                      onClick={() => void toggleTemplate(template)}
                    >
                      {template.is_active ? (
                        <Check size={18} />
                      ) : (
                        <RefreshCw size={18} />
                      )}
                    </button>

                    <button
                      className="admin-delete-action"
                      aria-label="حذف"
                      onClick={() => void deleteTemplate(template)}
                    >
                      <Trash2 size={18} />
                    </button>
                  </>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
