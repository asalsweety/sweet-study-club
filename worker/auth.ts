import { betterAuth } from 'better-auth'
import type { WorkerBindings } from './types'

const minimumSecretLength = 32

export class AuthConfigurationError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'AuthConfigurationError'
  }
}

function readAppOrigin(value: string | undefined) {
  if (!value?.trim()) {
    throw new AuthConfigurationError('APP_ORIGIN is missing.')
  }

  let url: URL

  try {
    url = new URL(value)
  } catch (cause) {
    throw new AuthConfigurationError('APP_ORIGIN is invalid.', {
      cause,
    })
  }

  if (url.origin !== url.href.replace(/\/$/, '')) {
    throw new AuthConfigurationError(
      'APP_ORIGIN must contain only an origin.',
    )
  }

  return url.origin
}

function readAuthSecret(value: string | undefined) {
  const secret = value?.trim()

  if (!secret || secret.length < minimumSecretLength) {
    throw new AuthConfigurationError(
      'BETTER_AUTH_SECRET must contain at least 32 characters.',
    )
  }

  return secret
}

export function createAuth(bindings: WorkerBindings) {
  const appOrigin = readAppOrigin(bindings.APP_ORIGIN)
  const secret = readAuthSecret(bindings.BETTER_AUTH_SECRET)
  const isLocal = bindings.APP_ENVIRONMENT === 'local'

  return betterAuth({
    appName: 'Sweet Study Club',
    database: bindings.DB,
    baseURL: appOrigin,
    basePath: '/api/auth',
    secret,
    trustedOrigins: [appOrigin],
    telemetry: {
      enabled: false,
    },
    emailAndPassword: {
      // Remote deployments must opt in explicitly. Unverified signup never
      // grants an admin role; password recovery needs a mail provider.
      enabled: isLocal || bindings.EMAIL_PASSWORD_AUTH_ENABLED === 'true',
      requireEmailVerification: false,
      autoSignIn: false,
      minPasswordLength: 10,
      maxPasswordLength: 128,
    },
    rateLimit: {
      enabled: !isLocal,
      storage: 'database',
      window: 60,
      max: 100,
      customRules: {
        '/sign-in/email': { window: 60, max: 10 },
        '/sign-up/email': { window: 300, max: 5 },
      },
    },
    user: {
      additionalFields: {
        role: {
          type: ['member', 'admin'],
          required: false,
          defaultValue: 'member',
          input: false,
        },
        theme: {
          type: ['light', 'dark', 'system'],
          required: false,
          defaultValue: 'light',
          input: false,
        },
      },
    },
    advanced: {
      ipAddress: { ipAddressHeaders: ['cf-connecting-ip'] },
      cookiePrefix: 'sweet-study',
      useSecureCookies: !isLocal,
      database: {
        generateId: 'uuid',
      },
    },
    databaseHooks: {
      user: {
        create: {
          // Roles are decided only here, server-side: configured admin emails,
          // plus the very first account on a local database for easy setup.
          before: async (user) => {
            const adminEmails = (bindings.ADMIN_EMAILS ?? '')
              .split(',')
              .map((email) => email.trim().toLowerCase())
              .filter(Boolean)
            let role: 'member' | 'admin' = (isLocal || user.emailVerified) && adminEmails.includes(user.email.toLowerCase()) ? 'admin' : 'member'
            if (role === 'member' && isLocal) {
              const existing = await bindings.DB.prepare('SELECT COUNT(*) AS total FROM user').first<{ total: number }>()
              if ((existing?.total ?? 0) === 0) role = 'admin'
            }
            return { data: { ...user, role } }
          },
        },
      },
    },
  })
}

export async function getAuthSession(
  bindings: WorkerBindings,
  headers: Headers,
) {
  return createAuth(bindings).api.getSession({ headers })
}
