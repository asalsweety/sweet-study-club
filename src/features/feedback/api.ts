import { feedbackPageSchema, feedbackReceiptSchema, type CreateFeedbackInput } from '../../shared/api/feedback'
import { get, post } from '../../shared/api/http'

export function submitFeedback(input: CreateFeedbackInput) {
  return post('/api/feedback', feedbackReceiptSchema, input)
}

export function listFeedback(before?: number) {
  const query = before === undefined ? '' : `?before=${before}`
  return get(`/api/admin/feedback${query}`, feedbackPageSchema)
}
