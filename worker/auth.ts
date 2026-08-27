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
      // Remote signup stays closed until verified email delivery and abuse
      // controls are configured; an unusable recovery flow is not shippable.
      enabled: isLocal,
      requireEmailVerification: false,
      autoSignIn: false,
      minPasswordLength: 10,
      maxPasswordLength: 128,
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
          defaultValue: 'system',
          input: false,
        },
      },
    },
    advanced: {
      cookiePrefix: 'sweet-study',
      useSecureCookies: !isLocal,
      database: {
        generateId: 'uuid',
      },
    },
  })
}
