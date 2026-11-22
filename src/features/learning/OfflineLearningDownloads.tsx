import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Download } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { appRoutes } from '../../app/navigation/routes'
import { Button } from '../../components/ui/button'
import { NativeSelect } from '../../components/ui/native-select'
import type { LearningPack } from '../../shared/api/learning'
import { fa } from '../../shared/lib/format'
import { Panel, QueryState } from './components'
import { listSavedPacks, savePackOffline } from './offline-library'

export default function OfflineLearningDownloads({ packs }: { packs: LearningPack[] }) {
  const client = useQueryClient()
  const [packId, setPackId] = useState('')
  const [progress, setProgress] = useState(0)
  const saved = useQuery({ queryKey: ['offline-library'], queryFn: listSavedPacks, networkMode: 'always' })
  const selected = packs.find((pack) => pack.id === packId)
  const downloaded = saved.data?.some((pack) => pack.id === packId)
  const download = useMutation({
    mutationFn: (id: string) => savePackOffline(id, setProgress),
    onSuccess: (pack) => {
      client.removeQueries({ queryKey: ['offline-pack', pack.id] })
      return client.invalidateQueries({ queryKey: ['offline-library'] })
    },
  })

  return <Panel className="grid gap-4">
    <h2 className="flex items-center gap-2 text-xl font-bold"><Download size={20} className="text-primary" />مطالعۀ آفلاین</h2>
    <p className="text-sm leading-7 text-muted-foreground">وقتی اینترنت داری، سؤال‌ها، تصویرها و درسنامه‌های یک بسته را روی همین دستگاه ذخیره کن. تمرین آفلاین در گزارش آزمون ثبت نمی‌شود.</p>
    <label className="grid gap-2 text-sm font-bold">
      بستۀ مطالعه
      <NativeSelect value={packId} disabled={download.isPending} onChange={(event) => {
        setPackId(event.target.value)
        download.reset()
      }}>
        <option value="">انتخاب مجموعه</option>
        {packs.map((pack) => <option key={pack.id} value={pack.id}>{pack.title} · {fa(pack.questionCount)} سؤال{pack.isSample ? ' · نمونه' : ''}</option>)}
      </NativeSelect>
    </label>
    <div className="flex flex-wrap gap-2">
      <Button disabled={!selected || download.isPending} onClick={() => { setProgress(0); download.mutate(packId) }}>
        {download.isPending ? 'در حال دانلود…' : downloaded ? 'دانلود نسخۀ تازه' : 'دانلود بسته'}
      </Button>
      <Button asChild variant="outline"><Link to={appRoutes.offline}>کتابخانۀ آفلاین</Link></Button>
    </div>
    {download.isPending && <p role="status" className="text-sm text-muted-foreground">
      {fa(progress)} سؤال دریافت شد. برای ذخیرۀ بسته و تصویرها این صفحه را باز نگه دار.
    </p>}
    {download.isSuccess && <p role="status" className="text-sm text-primary">«{download.data.title}» برای مطالعۀ آفلاین ذخیره شد.</p>}
    <QueryState error={download.error ?? saved.error} />
  </Panel>
}
