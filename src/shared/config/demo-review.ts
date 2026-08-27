export const demoReviewEnabled =
  import.meta.env.DEV &&
  import.meta.env.VITE_ENABLE_DEMO_LOGIN === 'true'

export const demoReviewCredentials = {
  email: 'demo@sweet.local',
  password: 'sweetdemo',
} as const
