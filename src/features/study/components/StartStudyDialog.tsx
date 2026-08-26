import type { FormEvent } from 'react'
import { Focus, Play, RotateCcw } from 'lucide-react'
import { studySubjects } from '../../../entities/study/model'

type StartStudyDialogProps = {
  selectedSubject: string
  customSubject: string
  focusLockEnabled: boolean
  scheduledSessionAvailable: boolean
  working: boolean
  onClose: () => void
  onSelectSubject: (subject: string) => void
  onCustomSubjectChange: (subject: string) => void
  onFocusLockChange: (enabled: boolean) => void
  onStartFreeStudy: (event: FormEvent<HTMLFormElement>) => void
  onStartScheduledStudy: () => void
}

export default function StartStudyDialog({
  selectedSubject,
  customSubject,
  focusLockEnabled,
  scheduledSessionAvailable,
  working,
  onClose,
  onSelectSubject,
  onCustomSubjectChange,
  onFocusLockChange,
  onStartFreeStudy,
  onStartScheduledStudy,
}: StartStudyDialogProps) {
  return (
    <div className="modal">
      <button
        className="modal-backdrop"
        aria-label="بستن"
        onClick={onClose}
      />

      <form
        className="start-card"
        onSubmit={onStartFreeStudy}
        role="dialog"
        aria-modal="true"
        aria-labelledby="start-study-title"
      >
        <button
          type="button"
          className="close-button"
          aria-label="بستن پنجره شروع مطالعه"
          onClick={onClose}
        >
          ×
        </button>

        <p>📚 امروز چی می‌خونی؟</p>
        <h2 id="start-study-title">شروع یک مطالعه جدید</h2>

        <div className="subject-grid">
          {studySubjects.map((subject) => (
            <button
              type="button"
              key={subject}
              className={
                selectedSubject === subject && !customSubject.trim()
                  ? 'selected'
                  : ''
              }
              onClick={() => onSelectSubject(subject)}
            >
              {subject}
            </button>
          ))}
        </div>

        <label>
          یا اسم درس را بنویس
          <input
            value={customSubject}
            onChange={(event) =>
              onCustomSubjectChange(event.target.value)
            }
            placeholder="مثلاً آناتومی"
          />
        </label>

        <label className="focus-option">
          <input
            type="checkbox"
            checked={focusLockEnabled}
            onChange={(event) =>
              onFocusLockChange(event.target.checked)
            }
          />

          <span>
            <Focus size={20} />
            فعال‌کردن Focus Lock
          </span>
        </label>

        <div className="start-actions">
          <button
            type="submit"
            className="primary-button"
            disabled={working}
          >
            <Play size={18} />
            شروع مطالعه آزاد
          </button>

          <button
            type="button"
            className="secondary-button"
            disabled={!scheduledSessionAvailable || working}
            onClick={onStartScheduledStudy}
          >
            <RotateCcw size={18} />
            ورود به پارت فعال
          </button>
        </div>
      </form>
    </div>
  )
}
