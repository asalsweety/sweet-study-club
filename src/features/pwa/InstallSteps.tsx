import { EllipsisVertical, Share } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog'

/** How to add the app on iPhone/iPad (Share menu) or from another browser's menu. */
export default function InstallSteps({ apple, onClose }: { apple: boolean; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle>افزودن به صفحۀ اصلی</DialogTitle>
          <DialogDescription>چند ثانیه طول می‌کشد؛ بعد سوئیت استادی مثل یک اپ کنار بقیۀ برنامه‌هایت است.</DialogDescription>
        </DialogHeader>
        {apple ? (
          <ol className="install-steps">
            <li><span>۱</span><p>این صفحه را در <b>Safari</b> باز کن (در کروم آیفون هم از همین مسیر می‌شود).</p></li>
            <li><span>۲</span><p>دکمۀ <b>اشتراک‌گذاری</b> <Share size={16} className="inline align-[-3px]" aria-label="Share" /> را پایین یا بالای صفحه بزن.</p></li>
            <li><span>۳</span><p>کمی پایین برو و <b>Add to Home Screen</b> یا «افزودن به صفحۀ اصلی» را انتخاب کن.</p></li>
            <li><span>۴</span><p>بالا سمت راست <b>Add</b> را بزن. تمام!</p></li>
          </ol>
        ) : (
          <ol className="install-steps">
            <li><span>۱</span><p>منوی مرورگر <EllipsisVertical size={16} className="inline align-[-3px]" aria-label="menu" /> را باز کن.</p></li>
            <li><span>۲</span><p><b>Install app</b> یا <b>Add to Home screen</b> («نصب برنامه» / «افزودن به صفحۀ اصلی») را بزن.</p></li>
            <li><span>۳</span><p>نصب را تأیید کن؛ آیکون سوئیت استادی روی صفحۀ اصلی می‌آید.</p></li>
          </ol>
        )}
        <Button variant="outline" onClick={onClose}>فهمیدم</Button>
      </DialogContent>
    </Dialog>
  )
}
