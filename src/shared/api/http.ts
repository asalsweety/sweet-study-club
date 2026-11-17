import type { ZodType } from 'zod'
import { ApiClientError } from './api-client-error'
import { apiErrorEnvelopeSchema } from './error'

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

const baseUrl = (import.meta.env?.VITE_API_BASE_URL ?? '').trim().replace(/\/$/, '')

/**
 * Same-origin JSON request with cookie credentials. Every response body is
 * validated against its contract so a server/client drift fails loudly.
 */
export async function http<T>(method: Method, path: string, schema: ZodType<T> | null, body?: unknown): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
  } catch (cause) {
    throw new ApiClientError('اتصال به سرور برقرار نشد.', { code: 'NETWORK_ERROR', cause })
  }

  const text = await response.text()
  let payload: unknown = null
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch (cause) {
      throw new ApiClientError('پاسخ سرور قابل خواندن نبود.', { code: 'INVALID_RESPONSE', status: response.status, cause })
    }
  }

  if (!response.ok) {
    const parsed = apiErrorEnvelopeSchema.safeParse(payload)
    // Better Auth returns { code, message }, while our API uses { error }.
    const authCode = path.startsWith('/api/auth/') && typeof payload === 'object' && payload !== null && 'code' in payload && typeof payload.code === 'string' ? payload.code : undefined
    throw new ApiClientError(parsed.success ? parsed.data.error.message : 'درخواست انجام نشد.', {
      code: parsed.success ? parsed.data.error.code : authCode ?? (response.status === 429 ? 'TOO_MANY_REQUESTS' : 'REQUEST_FAILED'),
      status: response.status,
      ...(parsed.success && parsed.data.error.requestId !== undefined ? { requestId: parsed.data.error.requestId } : {}),
    })
  }

  if (schema === null) return undefined as T
  const parsed = schema.safeParse(payload)
  if (!parsed.success) {
    throw new ApiClientError('پاسخ سرور با قرارداد برنامه نمی‌خواند.', {
      code: 'INVALID_RESPONSE',
      status: response.status,
      cause: parsed.error,
    })
  }
  return parsed.data
}

export const get = <T>(path: string, schema: ZodType<T>) => http('GET', path, schema)
export const post = <T>(path: string, schema: ZodType<T> | null, body?: unknown) => http('POST', path, schema, body ?? {})
export const patch = <T>(path: string, schema: ZodType<T>, body: unknown) => http('PATCH', path, schema, body)
export const put = <T>(path: string, schema: ZodType<T>, body: unknown) => http('PUT', path, schema, body)
export const del = <T>(path: string, schema: ZodType<T> | null) => http('DELETE', path, schema)

const persianMessages: Record<string, string> = {
  UNAUTHORIZED: 'لطفاً دوباره وارد حسابت شو.',
  FORBIDDEN: 'اجازه‌ی این کار را نداری.',
  VALIDATION_ERROR: 'اطلاعات واردشده درست نیست.',
  NOT_FOUND: 'پیدا نشد.',
  TIMER_ALREADY_ACTIVE: 'یک تایمر دیگر در حال اجراست.',
  TIMER_NOT_ACTIVE: 'تایمری در حال اجرا نیست.',
  TIMER_VERSION_CONFLICT: 'تایمر روی دستگاه دیگری تغییر کرد؛ صفحه به‌روز شد.',
  PART_NOT_OPEN: 'این پارت الان باز نیست.',
  ALREADY_FRIENDS: 'شما همین الان دوست هستید.',
  TOO_MANY_REQUESTS: 'درخواست‌های در انتظار زیاد شده است.',
  CHEER_LIMIT: 'یه کم صبر کن؛ این ساعت خیلی تشویق فرستادی.',
  ALREADY_OWNED: 'این محصول را قبلاً خریده‌ای.',
  CHIBI_INSUFFICIENT_COINS: 'برای گرفتن این وسیله به سکه‌ی بیشتری نیاز داری.',
  PAYMENTS_UNAVAILABLE: 'پرداخت آنلاین هنوز فعال نشده است.',
  ORDER_CLOSED: 'این سفارش دیگر قابل پرداخت نیست.',
  SUBJECT_EXISTS: 'درسی با این نام داری.',
  NETWORK_ERROR: 'اتصال به اینترنت برقرار نیست.',
}

/** Friendly Persian message for any thrown value. */
export function errorMessage(error: unknown, fallback = 'مشکلی پیش آمد. دوباره امتحان کن.') {
  if (error instanceof ApiClientError) return persianMessages[error.code] ?? error.message ?? fallback
  return fallback
}
