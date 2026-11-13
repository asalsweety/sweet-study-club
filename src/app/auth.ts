import { z } from 'zod'
import { ApiClientError } from '../shared/api/api-client-error'
import { http } from '../shared/api/http'

const sessionSchema = z
  .object({
    user: z.object({ id: z.string(), email: z.string(), name: z.string() }),
  })
  .nullable()

export type AuthSession = NonNullable<z.infer<typeof sessionSchema>>

const authErrors: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: 'ایمیل یا رمز عبور درست نیست.',
  USER_ALREADY_EXISTS: 'با این ایمیل قبلاً حساب ساخته شده است.',
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'با این ایمیل قبلاً حساب ساخته شده است.',
  PASSWORD_TOO_SHORT: 'رمز عبور باید حداقل ۱۰ کاراکتر باشد.',
  PASSWORD_TOO_LONG: 'رمز عبور خیلی طولانی است.',
  INVALID_EMAIL: 'ایمیل معتبر نیست.',
  TOO_MANY_REQUESTS: 'تعداد تلاش‌ها زیاد است. کمی صبر کن و دوباره امتحان کن.',
}

async function authRequest(path: string, body?: unknown) {
  try {
    return await http('POST', `/api/auth${path}`, z.unknown(), body ?? {})
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw new ApiClientError(authErrors[error.code] ?? (error.code === 'NETWORK_ERROR' ? error.message : 'ورود انجام نشد. دوباره امتحان کن.'), {
        code: error.code,
        ...(error.status === undefined ? {} : { status: error.status }),
      })
    }
    throw error
  }
}

export const auth = {
  session: async (): Promise<AuthSession | null> => {
    try {
      return await http('GET', '/api/auth/get-session', sessionSchema)
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) return null
      throw error
    }
  },
  signIn: (email: string, password: string) => authRequest('/sign-in/email', { email, password, rememberMe: true }),
  createAccount: (name: string, email: string, password: string) => authRequest('/sign-up/email', { name, email, password }),
  signUp: async (name: string, email: string, password: string) => {
    await authRequest('/sign-up/email', { name, email, password })
    // Auto sign-in is disabled server-side, so sign in explicitly.
    await authRequest('/sign-in/email', { email, password, rememberMe: true })
  },
  signOut: () => authRequest('/sign-out'),
}
