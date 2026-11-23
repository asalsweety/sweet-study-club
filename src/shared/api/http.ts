import { safeParse, type $ZodType } from 'zod/v4/core'
import { ApiClientError } from './api-client-error'
import { apiErrorEnvelopeSchema } from './error'
import { isSavedRead, offlineAccountId, readSavedResponse, saveResponse } from './offline-cache'
import { canReachApi, reportApiReachability } from './reachability'

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

const baseUrl = (import.meta.env?.VITE_API_BASE_URL ?? '').trim().replace(/\/$/, '')

/**
 * Same-origin JSON request with cookie credentials. Every response body is
 * validated against its contract so a server/client drift fails loudly.
 */
export async function http<T>(method: Method, path: string, schema: $ZodType<T> | null, body?: unknown, expectedAccountId?: string): Promise<T> {
  const savedRead = method === 'GET' && schema !== null && isSavedRead(path)
  const accountId = expectedAccountId ?? (savedRead ? offlineAccountId() : undefined)
  const readOffline = () => {
    const cached = schema && accountId ? safeParse(schema, readSavedResponse(accountId, path)) : null
    if (cached?.success) return cached.data
    throw new ApiClientError('این بخش هنوز روی دستگاه ذخیره نشده است.', { code: 'OFFLINE_NOT_CACHED' })
  }
  if (savedRead && !canReachApi()) return readOffline()
  let response: Response
  // A Blob (e.g. a profile picture) is sent as-is with its own type.
  const raw = typeof Blob !== 'undefined' && body instanceof Blob
  const timeout = method === 'GET' && (savedRead || path === '/api/auth/get-session' || path === '/api/health')
    ? AbortSignal.timeout?.(8000) : undefined
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      credentials: 'include',
      ...(timeout === undefined ? {} : { signal: timeout }),
      headers: {
        Accept: 'application/json',
        ...(accountId === undefined ? {} : { 'X-SweetStudy-Account': accountId }),
        ...(body === undefined ? {} : { 'Content-Type': raw ? body.type : 'application/json' }),
      },
      ...(body === undefined ? {} : { body: raw ? body : JSON.stringify(body) }),
    })
  } catch (cause) {
    if (globalThis.navigator?.onLine === true) reportApiReachability(false)
    if (savedRead) return readOffline()
    throw new ApiClientError('اتصال به سرور برقرار نشد.', { code: 'NETWORK_ERROR', cause })
  }

  const unavailable = [502, 503, 504].includes(response.status)
  if (globalThis.navigator?.onLine === true) reportApiReachability(!unavailable)
  if (unavailable && savedRead) return readOffline()
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
  const parsed = safeParse(schema, payload)
  if (!parsed.success) {
    throw new ApiClientError('پاسخ سرور با قرارداد برنامه نمی‌خواند.', {
      code: 'INVALID_RESPONSE',
      status: response.status,
      cause: parsed.error,
    })
  }
  if (savedRead && accountId) saveResponse(accountId, path, parsed.data)
  return parsed.data
}

export const get = <T>(path: string, schema: $ZodType<T>, accountId?: string) => http('GET', path, schema, undefined, accountId)
export const post = <T>(path: string, schema: $ZodType<T> | null, body?: unknown, accountId?: string) => http('POST', path, schema, body ?? {}, accountId)
export const patch = <T>(path: string, schema: $ZodType<T>, body: unknown, accountId?: string) => http('PATCH', path, schema, body, accountId)
export const put = <T>(path: string, schema: $ZodType<T>, body: unknown, accountId?: string) => http('PUT', path, schema, body, accountId)
export const del = <T>(path: string, schema: $ZodType<T> | null, accountId?: string) => http('DELETE', path, schema, undefined, accountId)

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
