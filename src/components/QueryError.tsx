import { RefreshCw } from 'lucide-react'
import { errorMessage } from '../shared/api/http'
import { Button } from './ui/button'
export default function QueryError({ error, retry }: { error: unknown; retry?: () => void }) {
  return <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/20 bg-[var(--destructive-soft)] p-4 text-sm text-[var(--destructive-text)]"><p>{errorMessage(error)}</p>{retry && <Button variant="outline" size="sm" onClick={retry}><RefreshCw size={14} />تلاش دوباره</Button>}</div>
}
