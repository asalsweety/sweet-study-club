import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Mail, Send } from 'lucide-react'
import { useState } from 'react'
import { api } from '../../app/api'
import { queryKeys, useEntitlements } from '../../app/session'
import { errorMessage } from '../../shared/api/http'
import { jalaliShort } from '../../shared/lib/format'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'

const statusText = { submitted: 'ارسال شد', in_progress: 'در حال نوشتن', delivered: 'تحویل شد 💌' } as const

export default function PlanRequestsPanel() {
  const client = useQueryClient()
  const entitlements = useEntitlements()
  const requests = useQuery({ queryKey: queryKeys.planRequests, queryFn: api.shop.planRequests })
  const [goal, setGoal] = useState('')
  const [details, setDetails] = useState('')
  const canRequest = entitlements.data?.kinds.some((kind) => kind === 'plan_by_asal' || kind === 'dna_plan') ?? false

  const send = useMutation({
    mutationFn: () => api.shop.requestPlan(goal.trim(), details.trim()),
    onSuccess: (next) => {
      client.setQueryData(queryKeys.planRequests, next)
      setGoal('')
      setDetails('')
    },
  })

  if (!canRequest && (requests.data?.length ?? 0) === 0) return null

  return (
    <section className="glass rise flex flex-col gap-4 rounded-2xl p-5 sm:p-6">
      <h2 className="flex items-center gap-2 text-lg font-bold"><Mail size={19} className="text-primary" /> برنامه‌ی شخصی من</h2>
      {canRequest && (
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            send.mutate()
          }}
        >
          <Input required maxLength={200} value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="هدفت چیست؟ مثلاً قبولی پزشکی تهران" />
          <Textarea
            rows={4}
            maxLength={3000}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="پایه، رشته، ساعت‌های آزاد، درس‌های قوی و ضعیف، منابع، تراز آزمون‌ها..."
          />
          <Button type="submit" disabled={!goal.trim() || send.isPending} className="rounded-2xl bg-primary font-bold">
            <Send /> ارسال برای Asal
          </Button>
          {send.isError && <p className="text-sm text-destructive">{errorMessage(send.error)}</p>}
        </form>
      )}
      <ul className="flex flex-col gap-2">
        {requests.data?.map((request) => (
          <li key={request.id} className="flex flex-col gap-2 rounded-2xl bg-muted/40 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="font-bold">{request.goal}</p>
              <span className="shrink-0 text-xs font-bold text-muted-foreground">{statusText[request.status]} · {jalaliShort(request.createdAt.slice(0, 10))}</span>
            </div>
            {request.response && <p className="whitespace-pre-line rounded-xl bg-card p-3 text-sm leading-7">{request.response}</p>}
          </li>
        ))}
      </ul>
    </section>
  )
}
