import { useRegisterSW } from 'virtual:pwa-register/react'

export default function PwaUpdatePrompt() {
  const {
    needRefresh: [needsRefresh, setNeedsRefresh],
    offlineReady: [isOfflineReady, setIsOfflineReady],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needsRefresh && !isOfflineReady) return null

  const close = () => {
    setNeedsRefresh(false)
    setIsOfflineReady(false)
  }

  return (
    <aside className="pwa-notice" role="status" aria-live="polite">
      <p>
        {needsRefresh
          ? 'نسخۀ تازه آماده است. برای جلوگیری از قطع تایمر، زمان به‌روزرسانی را خودت انتخاب کن.'
          : 'برنامه برای استفادهٔ آفلاین آماده است. پس از اولین ورود می‌توانی بدون اینترنت با تایمر و پلنر کار کنی. بسته‌های سؤال را پیش از قطع اینترنت دانلود کن.'}
      </p>
      <div>
        {needsRefresh && (
          <button
            type="button"
            onClick={() => void updateServiceWorker(true)}
          >
            به‌روزرسانی
          </button>
        )}
        <button type="button" onClick={close}>
          بعداً
        </button>
      </div>
    </aside>
  )
}
